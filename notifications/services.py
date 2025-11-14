# services.py - Final complete version
import json
import logging
import pika
import time
from django.conf import settings
from django.core.cache import cache
from django.core.exceptions import ObjectDoesNotExist
from .models import Notification, IdempotencyKey

logger = logging.getLogger('notifications')


class CircuitBreakerError(Exception):
    """Custom exception for circuit breaker failures"""
    pass


class CircuitBreaker:
    def __init__(self, name, failure_threshold=5, recovery_timeout=60, expected_exceptions=()):
        self.name = name
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.expected_exceptions = expected_exceptions
        self.failures = 0
        self.state = "CLOSED"  
        self.last_failure_time = None
        self.last_state_change = time.time()
    
    def call(self, func, *args, **kwargs):
        if self.state == "OPEN":
            if self._can_retry():
                self.state = "HALF_OPEN"
                self.last_state_change = time.time()
                logger.warning("Circuit breaker %s moving to HALF_OPEN state", self.name)
            else:
                raise CircuitBreakerError(f"Circuit breaker {self.name} is OPEN - service unavailable")
        
        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            if isinstance(e, self.expected_exceptions) or not self.expected_exceptions:
                self._on_failure()
            raise e
    
    def _on_success(self):
        self.failures = 0
        if self.state == "HALF_OPEN":
            self.state = "CLOSED"
            self.last_state_change = time.time()
            logger.info("Circuit breaker %s moving to CLOSED state - service recovered", self.name)
    
    def _on_failure(self):
        self.failures += 1
        self.last_failure_time = time.time()
        
        if self.failures >= self.failure_threshold and self.state != "OPEN":
            self.state = "OPEN"
            self.last_state_change = time.time()
            logger.warning("Circuit breaker %s moving to OPEN state - service failing", self.name)
    
    def _can_retry(self):
        if not self.last_failure_time:
            return True
        return (time.time() - self.last_failure_time) >= self.recovery_timeout
    
    def get_state(self):
        return {
            'name': self.name,
            'state': self.state,
            'failures': self.failures,
            'last_failure_time': self.last_failure_time,
            'last_state_change': self.last_state_change
        }
    
    def reset(self):
        self.failures = 0
        self.state = "CLOSED"
        self.last_failure_time = None
        self.last_state_change = time.time()
        logger.info("Circuit breaker %s manually reset", self.name)


class RetrySystem:
    """Implements exponential backoff retry logic"""
    
    @staticmethod
    def retry_with_backoff(func, max_retries=3, base_delay=1, max_delay=30):
        """
        Retry a function with exponential backoff
        """
        last_exception = None
        
        for attempt in range(max_retries + 1):  
            try:
                if attempt > 0:
                    logger.info("Retry attempt %d/%d", attempt, max_retries)
                return func()
            except Exception as e:
                last_exception = e
                if attempt == max_retries:
                    logger.error("All %d retry attempts failed: %s", max_retries, str(e))
                    break
                
               
                delay = min(base_delay * (2 ** attempt), max_delay)
                jitter = delay * 0.1  # 10% jitter
                actual_delay = delay + (jitter * (0.5 - (time.time() % 1)))
                
                logger.warning("Attempt %d failed. Retrying in %.2fs. Error: %s", 
                             attempt + 1, actual_delay, str(e))
                time.sleep(actual_delay)
        
        raise last_exception


class CircuitBreakerManager:
    """Manages multiple circuit breakers"""
    
    def __init__(self):
        self.breakers = {}
    
    def get_breaker(self, name, **kwargs):
        if name not in self.breakers:
            self.breakers[name] = CircuitBreaker(name, **kwargs)
        return self.breakers[name]
    
    def get_all_states(self):
        return {name: breaker.get_state() for name, breaker in self.breakers.items()}
    
    def reset_breaker(self, name):
        if name in self.breakers:
            self.breakers[name].reset()
    
    def reset_all(self):
        for breaker in self.breakers.values():
            breaker.reset()



circuit_breaker_manager = CircuitBreakerManager()


class RabbitMQService:
    def __init__(self):
        self.connection = None
        self.channel = None
        self.connect()
    
    def connect(self):
        try:
            self.connection = pika.BlockingConnection(
                pika.URLParameters(settings.RABBITMQ_URL)
            )
            self.channel = self.connection.channel()
            
            
            self.channel.exchange_declare(
                exchange='notifications.direct', 
                exchange_type='direct', 
                durable=True
            )
            
            
            queues = ['email.queue', 'push.queue', 'failed.queue']
            for queue in queues:
                self.channel.queue_declare(queue=queue, durable=True)
                
                
                if queue in ['email.queue', 'push.queue']:
                    self.channel.queue_bind(
                        exchange='notifications.direct', 
                        queue=queue, 
                        routing_key=queue.replace('.queue', '')  
                    )
            
            logger.info("Successfully connected to RabbitMQ and created queues")
            
        except Exception as e:
            logger.error("Failed to connect to RabbitMQ: %s", str(e))
            raise
    
    def publish_message(self, routing_key, message):
        try:
            if not self.connection or self.connection.is_closed:
                self.connect()
                
            
            queue_name = f"{routing_key}.queue"
            
            self.channel.basic_publish(
                exchange='notifications.direct',
                routing_key=routing_key,  
                body=json.dumps(message),
                properties=pika.BasicProperties(
                    delivery_mode=2,  
                )
            )
            logger.info("Message published to %s: %s", routing_key, message['request_id'])
            return True
            
        except Exception as e:
            logger.error("Failed to publish message to %s: %s", routing_key, str(e))
            return False
    
    def close(self):
        if self.connection and not self.connection.is_closed:
            self.connection.close()


class NotificationService:
    def __init__(self):
        self.rabbitmq = RabbitMQService()
        
        self.mq_breaker = circuit_breaker_manager.get_breaker(
            'rabbitmq',
            failure_threshold=3,
            recovery_timeout=30,
            expected_exceptions=(pika.exceptions.AMQPConnectionError,)
        )
        self.db_breaker = circuit_breaker_manager.get_breaker(
            'database',
            failure_threshold=2,
            recovery_timeout=60
        )
    
    def send_notification(self, notification_data):
        try:
            
            notification = self._execute_with_retry_and_circuit_breaker(
                self.db_breaker,
                lambda: self._create_notification_record(notification_data),
                max_retries=2
            )
            
            message = {
                'notification_id': str(notification.id),
                'user_id': str(notification_data['user_id']),
                'template_code': notification_data['template_code'],
                'variables': notification_data['variables'],
                'request_id': notification_data['request_id'],
                'priority': notification_data.get('priority', 1),
            }
            
            
            routing_key = notification_data['notification_type']
            success = self._execute_with_retry_and_circuit_breaker(
                self.mq_breaker,
                lambda: self.rabbitmq.publish_message(routing_key, message),
                max_retries=2
            )
            
            if not success:
                
                self._execute_with_retry(
                    lambda: self._update_notification_status(notification.id, 'failed')
                )
                return False
            
            logger.info("Notification %s queued successfully", notification.id)
            return True
            
        except CircuitBreakerError as e:
            logger.error("Circuit breaker blocked notification: %s", str(e))
            
            try:
                self._execute_with_retry(
                    lambda: Notification.objects.create(
                        notification_type=notification_data['notification_type'],
                        user_id=notification_data['user_id'],
                        template_code=notification_data['template_code'],
                        variables=notification_data['variables'],
                        request_id=notification_data['request_id'],
                        priority=notification_data.get('priority', 1),
                        status='failed',
                        metadata={**notification_data.get('metadata', {}), 'error': str(e), 'circuit_breaker_open': True}
                    )
                )
            except Exception as db_error:
                logger.error("Even database operation failed during circuit breaker open: %s", db_error)
            return False
            
        except Exception as e:
            logger.error("Failed to send notification: %s", str(e))
            return False
    
    def _execute_with_retry_and_circuit_breaker(self, circuit_breaker, func, max_retries=3):
        """Execute function with both circuit breaker protection and retry logic"""
        def operation_with_retry():
            return RetrySystem.retry_with_backoff(func, max_retries=max_retries)
        
        return circuit_breaker.call(operation_with_retry)
    
    def _execute_with_retry(self, func, max_retries=2):
        """Execute function with retry logic only"""
        return RetrySystem.retry_with_backoff(func, max_retries=max_retries)
    
    def _create_notification_record(self, notification_data):
        """Helper method for database operation"""
        return Notification.objects.create(
            notification_type=notification_data['notification_type'],
            user_id=notification_data['user_id'],
            template_code=notification_data['template_code'],
            variables=notification_data['variables'],
            request_id=notification_data['request_id'],
            priority=notification_data.get('priority', 1),
            metadata=notification_data.get('metadata')
        )
    
    def _update_notification_status(self, notification_id, status):
        """Helper method to update notification status"""
        notification = Notification.objects.get(id=notification_id)
        notification.status = status
        notification.save()
    
    def check_idempotency(self, request_id):
        try:
           
            cached_response = cache.get(f"idempotency_{request_id}")
            if cached_response:
                return cached_response
            
           
            try:
                key_record = IdempotencyKey.objects.get(key=request_id)
                
                cache.set(f"idempotency_{request_id}", key_record.response, timeout=86400)
                return key_record.response
            except ObjectDoesNotExist:
                return None
                
        except Exception as e:
            logger.error("Error checking idempotency: %s", str(e))
            return None
    
    def store_idempotency_key(self, request_id, response_data):
        try:
            IdempotencyKey.objects.create(
                key=request_id,
                response=response_data
            )
            cache.set(f"idempotency_{request_id}", response_data, timeout=86400)
        except Exception as e:
            logger.error("Error storing idempotency key: %s", str(e))