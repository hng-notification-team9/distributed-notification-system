from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.db import connection
from django.core.cache import cache
import pika
from django.conf import settings
import time

@api_view(['GET'])
def health_check(request):
    checks = {
        'database': False,
        'cache': False,
        'message_queue': False,
    }
    
   
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        checks['database'] = True
    except Exception:
        pass
    
   
    try:
        cache.set('health_check', 'ok', 1)
        checks['cache'] = cache.get('health_check') == 'ok'
    except Exception:
        pass
    
 
    try:
        connection = pika.BlockingConnection(
            pika.URLParameters(settings.RABBITMQ_URL)
        )
        checks['message_queue'] = connection.is_open
        connection.close()
    except Exception:
        pass
    
    is_healthy = all(checks.values())
    
    return Response({
        'status': 'healthy' if is_healthy else 'unhealthy',
        'checks': checks,
        'timestamp': time.time()
    }, status=200 if is_healthy else 503)
