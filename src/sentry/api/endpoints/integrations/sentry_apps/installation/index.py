from django.utils.translation import ugettext_lazy as _
from rest_framework import serializers
from rest_framework.request import Request
from rest_framework.response import Response

from sentry.api.base import pending_silo_endpoint
from sentry.api.bases import SentryAppInstallationsBaseEndpoint
from sentry.api.paginator import OffsetPaginator
from sentry.api.serializers import serialize
from sentry.constants import SENTRY_APP_SLUG_MAX_LENGTH
from sentry.models import SentryAppInstallation
from sentry.sentry_apps import SentryAppInstallationCreator


class SentryAppInstallationsSerializer(serializers.Serializer):
    slug = serializers.RegexField(
        r"^[a-z0-9_\-]+$",
        max_length=SENTRY_APP_SLUG_MAX_LENGTH,
        error_messages={
            "invalid": _(
                "Enter a valid slug consisting of lowercase letters, "
                "numbers, underscores or hyphens."
            )
        },
    )

    def validate(self, attrs):
        if not attrs.get("slug"):
            raise serializers.ValidationError("Sentry App slug is required")
        return attrs


@pending_silo_endpoint
class SentryAppInstallationsEndpoint(SentryAppInstallationsBaseEndpoint):
    def get(self, request: Request, organization) -> Response:
        queryset = SentryAppInstallation.objects.filter(organization_id=organization.id)

        return self.paginate(
            request=request,
            queryset=queryset,
            order_by="-date_added",
            paginator_cls=OffsetPaginator,
            on_results=lambda x: serialize(x, request.user),
        )

    def post(self, request: Request, organization) -> Response:
        serializer = SentryAppInstallationsSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        # check for an exiting installation and return that if it exists
        slug = serializer.validated_data.get("slug")
        try:
            install = SentryAppInstallation.objects.get(
                sentry_app__slug=slug, organization=organization
            )
        except SentryAppInstallation.DoesNotExist:
            install = SentryAppInstallationCreator(
                organization_id=organization.id, slug=slug, notify=True
            ).run(user=request.user, request=request)

        return Response(serialize(install))
