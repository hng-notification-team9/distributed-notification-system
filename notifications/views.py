import logging
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.core.cache import cache
from .models import Notification
from .serializers import (
    NotificationCreateSerializer,
    NotificationStatusUpdateSerializer,
    NotificationResponseSerializer,
    APIResponseSerializer,
    PaginationMetaSerializer
)
from .services import NotificationService, CircuitBreaker
from rest_framework.throttling import UserRateThrottle

logger = logging.getLogger('notifications')

class NotificationPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'limit'
    max_page_size = 100

    def get_paginated_response(self, data):
        return Response({
            'success': True,
            'data': data,
            'message': 'Notifications retrieved successfully',
            'meta': {
                'total': self.page.paginator.count,
                'limit': self.get_page_size(self.request),
                'page': self.page.number,
                'total_pages': self.page.paginator.num_pages,
                'has_next': self.page.has_next(),
                'has_previous': self.page.has_previous(),
            }
        })

class NotificationThrottle(UserRateThrottle):
    rate = '1000/hour'
    
class NotificationView(APIView):
    throttle_classes = [NotificationThrottle]
    def get(self, request):
       
        try:
            paginator = NotificationPagination()
            notifications = Notification.objects.all().order_by('-created_at')
            result_page = paginator.paginate_queryset(notifications, request)
            
            serializer = NotificationResponseSerializer(result_page, many=True)
            return paginator.get_paginated_response(serializer.data)
            
        except Exception as e:
            logger.error(f"Error listing notifications: {str(e)}")
            return Response(
                APIResponseSerializer({
                    'success': False,
                    'error': 'Internal server error',
                    'message': 'Failed to retrieve notifications'
                }).data,
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def post(self, request):
        
        try:
            serializer = NotificationCreateSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(
                    APIResponseSerializer({
                        'success': False,
                        'error': 'Validation failed',
                        'message': 'Invalid request data',
                        'data': serializer.errors
                    }).data,
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            data = serializer.validated_data
            request_id = data['request_id']
            
            notification_service = NotificationService()
            existing_response = notification_service.check_idempotency(request_id)
            if existing_response:
                logger.info(f"Idempotent request detected: {request_id}")
                return Response(existing_response)
            
            success = notification_service.send_notification(data)
            
            if success:
                response_data = APIResponseSerializer({
                    'success': True,
                    'data': {
                        'notification_id': data['request_id'],
                        'status': 'queued'
                    },
                    'message': 'Notification queued successfully'
                }).data
            
                notification_service.store_idempotency_key(request_id, response_data)
                
                return Response(response_data, status=status.HTTP_202_ACCEPTED)
            else:
                return Response(
                    APIResponseSerializer({
                        'success': False,
                        'error': 'Queueing failed',
                        'message': 'Failed to queue notification'
                    }).data,
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
                
        except Exception as e:
            logger.error(f"Error creating notification: {str(e)}")
            return Response(
                APIResponseSerializer({
                    'success': False,
                    'error': 'Internal server error',
                    'message': 'An error occurred while processing your request'
                }).data,
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

@api_view(['POST'])
def update_notification_status(request, notification_type):
   
    try:
        serializer = NotificationStatusUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                APIResponseSerializer({
                    'success': False,
                    'error': 'Validation failed',
                    'message': 'Invalid status update data'
                }).data,
                status=status.HTTP_400_BAD_REQUEST
            )
        
        data = serializer.validated_data
        notification_id = data['notification_id']
        
        try:
            notification = Notification.objects.get(request_id=notification_id)
            notification.status = data['status']
            notification.save()
            
            logger.info(f"Notification {notification_id} status updated to {data['status']}")
            
            return Response(
                APIResponseSerializer({
                    'success': True,
                    'message': 'Status updated successfully'
                }).data
            )
            
        except Notification.DoesNotExist:
            return Response(
                APIResponseSerializer({
                    'success': False,
                    'error': 'Not found',
                    'message': 'Notification not found'
                }).data,
                status=status.HTTP_404_NOT_FOUND
            )
            
    except Exception as e:
        logger.error(f"Error updating notification status: {str(e)}")
        return Response(
            APIResponseSerializer({
                'success': False,
                'error': 'Internal server error',
                'message': 'Failed to update status'
            }).data,
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )