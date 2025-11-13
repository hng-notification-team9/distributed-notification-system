import json
import logging
import pika
from django.conf import settings
from django.core.cache import cache
from .models import Notification, IdempotencyKey
import time

logger = logging.getLogger('notifications')

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
            
            try:
                self.channel.queue_declare(queue='email.queue', passive=True)
                self.channel.queue_declare(queue='push.queue', passive=True)
                self.channel.queue_declare(queue='failed.queue', passive=True)
                logger.info("Queues already exist, using passive declaration")
            except pika.exceptions.ChannelClosedByBroker as e:
                if '404' in str(e):  
                    
                    logger.info("Queues not found, creating them...")
                    self.channel.queue_declare(queue='email.queue', durable=True)
                    self.channel.queue_declare(queue='push.queue', durable=True)
                    self.channel.queue_declare(queue='failed.queue', durable=True)
                    
                    
                    self.channel.queue_bind(
                        exchange='notifications.direct', 
                        queue='email.queue', 
                        routing_key='email.queue'
                    )
                    self.channel.queue_bind(
                        exchange='notifications.direct', 
                        queue='push.queue', 
                        routing_key='push.queue'
                    )
                else:
                    raise e
            
            logger.info("Successfully connected to RabbitMQ")
            
        except Exception as e:
            logger.error(f"Failed to connect to RabbitMQ: {str(e)}")
            raise
    
    def publish_message(self, routing_key, message):
        try:
            if not self.connection or self.connection.is_closed:
                self.connect()
                
            self.channel.basic_publish(
                exchange='notifications.direct',
                routing_key=routing_key,
                body=json.dumps(message),
                properties=pika.BasicProperties(
                    delivery_mode=2,  
                )
            )
            logger.info(f"Message published to {routing_key}: {message['request_id']}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to publish message to {routing_key}: {str(e)}")
            return False
    
    def close(self):
        if self.connection and not self.connection.is_closed:
            self.connection.close()

class NotificationService:
    def __init__(self):
        self.rabbitmq = RabbitMQService()
    
    def send_notification(self, notification_data):
        try:
            
            notification = Notification.objects.create(
                notification_type=notification_data['notification_type'],
                user_id=notification_data['user_id'],
                template_code=notification_data['template_code'],
                variables=notification_data['variables'],
                request_id=notification_data['request_id'],
                priority=notification_data.get('priority', 1),
                metadata=notification_data.get('metadata')
            )
            
          
            message = {
                'notification_id': str(notification.id),
                'user_id': str(notification_data['user_id']),
                'template_code': notification_data['template_code'],
                'variables': notification_data['variables'],
                'request_id': notification_data['request_id'],
                'priority': notification_data.get('priority', 1),
            }
            
           
            routing_key = f"{notification_data['notification_type']}.queue"
            success = self.rabbitmq.publish_message(routing_key, message)
            
            if not success:
                notification.status = Notification.Status.FAILED
                notification.save()
                return False
            
            logger.info(f"Notification {notification.id} queued successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send notification: {str(e)}")
            return False
    
    def check_idempotency(self, request_id):
        
        try:
           
            cached_response = cache.get(f"idempotency_{request_id}")
            if cached_response:
                return cached_response
            
            
            try:
                key_record = IdempotencyKey.objects.get(key=request_id)
                cache.set(f"idempotency_{request_id}", key_record.response, timeout=86400)
                return key_record.response
            except IdempotencyKey.DoesNotExist:
                return None
                
        except Exception as e:
            logger.error(f"Error checking idempotency: {str(e)}")
            return None
    
    def store_idempotency_key(self, request_id, response_data):
       
        try:
            IdempotencyKey.objects.create(
                key=request_id,
                response=response_data
            )
            cache.set(f"idempotency_{request_id}", response_data, timeout=86400)
        except Exception as e:
            logger.error(f"Error storing idempotency key: {str(e)}")

class CircuitBreaker:
    def __init__(self, failure_threshold=5, recovery_timeout=60):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failures = 0
        self.state = "CLOSED"  
        self.last_failure_time = None
    
    def call(self, func, *args, **kwargs):
        if self.state == "OPEN":
            
            if self._can_retry():
                self.state = "HALF_OPEN"
                logger.info("Circuit breaker moving to HALF_OPEN state")
            else:
                raise Exception("Circuit breaker is OPEN - service unavailable")
        
        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            raise e
    
    def _on_success(self):
        self.failures = 0
        if self.state == "HALF_OPEN":
            self.state = "CLOSED"
            logger.info("Circuit breaker moving to CLOSED state")
    
    def _on_failure(self):
        self.failures += 1
        self.last_failure_time = time.time()
        
        if self.failures >= self.failure_threshold:
            self.state = "OPEN"
            logger.warning("Circuit breaker moving to OPEN state")
    
    def _can_retry(self):
        if not self.last_failure_time:
            return True
        return (time.time() - self.last_failure_time) >= self.recovery_timeout