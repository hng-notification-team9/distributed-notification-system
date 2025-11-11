import time
import logging
import uuid

logger = logging.getLogger('notifications')

class LoggingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
      
        request_id = str(uuid.uuid4())
        request.request_id = request_id
        
        start_time = time.time()
     
        logger.info(f"Request {request_id}: {request.method} {request.path}")
        
        response = self.get_response(request)
        
  
        response_time = time.time() - start_time
        
   
        logger.info(
            f"Response {request_id}: {response.status_code} "
            f"- {response_time:.2f}s"
        )
        
        return response