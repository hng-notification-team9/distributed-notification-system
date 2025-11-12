from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.db import connection as db_connection  
from django.core.cache import cache
import pika
from django.conf import settings
import time
import logging

logger = logging.getLogger(__name__)

@api_view(['GET'])
def health_check(request):
    checks = {
        'database': False,
        'cache': False,
        'message_queue': False,
    }
    
    
    try:
        with db_connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        checks['database'] = True
        logger.info("Database health check: SUCCESS")
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
    
    
    try:
        cache.set('health_check', 'ok', 1)
        checks['cache'] = cache.get('health_check') == 'ok'
        if checks['cache']:
            logger.info("Cache health check: SUCCESS")
        else:
            logger.error("Cache health check: FAILED - could not retrieve cached value")
    except Exception as e:
        logger.error(f"Cache health check failed: {e}")
    
 
    try:
        mq_connection = pika.BlockingConnection( 
            pika.URLParameters(settings.RABBITMQ_URL)
        )
        checks['message_queue'] = mq_connection.is_open
        mq_connection.close()
        logger.info("Message queue health check: SUCCESS")
    except Exception as e:
        logger.error(f"Message queue health check failed: {e}")
    
    is_healthy = all(checks.values())
    
    return Response({
        'status': 'healthy' if is_healthy else 'unhealthy',
        'checks': checks,
        'timestamp': time.time()
    }, status=200 if is_healthy else 503)