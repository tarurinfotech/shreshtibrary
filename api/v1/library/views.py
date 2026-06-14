from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.pagination import PageNumberPagination
import logging

logger = logging.getLogger(__name__)

from drf_spectacular.utils import extend_schema

from shreshtlibrary.utils.permissions import IsStudent
from utils.response import standard_response
from apps.library.models import LibraryInfo, Achiever, Review
from .serializers import LibraryInfoSerializer, AchieverSerializer, ReviewSerializer

class LibraryInfoView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(responses={200: LibraryInfoSerializer}, tags=['Library Info'])
    def get(self, request):
        info = LibraryInfo.objects.first()
        if not info:
            return standard_response(data=None)
        serializer = LibraryInfoSerializer(info)
        return standard_response(data=serializer.data)


class AchieversListView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(responses={200: AchieverSerializer(many=True)}, tags=['Library Info'])
    def get(self, request):
        achievers = Achiever.objects.all().order_by('-year')
        
        paginator = PageNumberPagination()
        paginator.page_size = 20
        result_page = paginator.paginate_queryset(achievers, request)
        serializer = AchieverSerializer(result_page, many=True)
        return paginator.get_paginated_response(serializer.data)


class ReviewsListView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(responses={200: ReviewSerializer(many=True)}, tags=['Library Info'])
    def get(self, request):
        reviews = Review.objects.select_related('student').filter(is_approved=True).order_by('-created_at')
        
        paginator = PageNumberPagination()
        paginator.page_size = 20
        result_page = paginator.paginate_queryset(reviews, request)
        serializer = ReviewSerializer(result_page, many=True)
        return paginator.get_paginated_response(serializer.data)



class StudentSubmitReviewView(APIView):
    permission_classes = [IsStudent]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'review_submit'

    @extend_schema(request=ReviewSerializer, responses={201: ReviewSerializer}, tags=['Library Info'])
    def post(self, request):
        serializer = ReviewSerializer(data=request.data)
        if serializer.is_valid():
            review = serializer.save(student=request.user, is_approved=False)  # pending approval
            
            try:
                from apps.notifications.models import AdminInboxNotification
                from api.v1.v2_admin import _full_name
                AdminInboxNotification.objects.create(
                    type='SUPPORT',
                    title='New Review/Message Submitted',
                    message=f"Student {_full_name(request.user)} submitted a review/message: {review.comment[:50]}...",
                    related_id=str(review.id),
                    student=request.user
                )
            except Exception as e:
                logger.error(f"Failed to create AdminInboxNotification: {e}", exc_info=True)

            return standard_response(
                message="Review submitted. It will be visible once approved by admin.",
                data=serializer.data,
                status_code=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
