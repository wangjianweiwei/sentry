from __future__ import annotations

from collections import defaultdict
from typing import Any, Iterable, Mapping, MutableMapping

from sentry.constants import ObjectStatus
from sentry.models import ExternalActor, Integration, Organization, Team, User
from sentry.notifications.notifications.base import BaseNotification
from sentry.services.hybrid_cloud.actor import ActorType, RpcActor
from sentry.services.hybrid_cloud.identity import RpcIdentity, RpcIdentityProvider, identity_service
from sentry.services.hybrid_cloud.integration import RpcIntegration, integration_service
from sentry.services.hybrid_cloud.user import RpcUser
from sentry.types.integrations import EXTERNAL_PROVIDERS, ExternalProviders


def get_context(
    notification: BaseNotification,
    recipient: RpcActor | Team | RpcUser,
    shared_context: Mapping[str, Any],
    extra_context: Mapping[str, Any],
) -> Mapping[str, Any]:
    """Compose the various levels of context and add Slack-specific fields."""
    return {
        **shared_context,
        **notification.get_recipient_context(RpcActor.from_object(recipient), extra_context),
    }


def _get_channel_and_integration_by_user(
    user_id: int,
    organization: Organization,
    provider: ExternalProviders,
) -> Mapping[str, RpcIntegration]:

    identities = identity_service.get_user_identities_by_provider_type(
        user_id=user_id,
        provider_type=EXTERNAL_PROVIDERS[provider],
        exclude_matching_external_ids=True,
    )

    if not identities:
        # The user may not have linked their identity so just move on
        # since there are likely other users or teams in the list of
        # recipients.
        return {}

    identity_id_to_idp: Mapping[RpcIdentity.id, RpcIdentityProvider | None] = {
        identity.id: identity_service.get_provider(provider_id=identity.idp_id)
        for identity in identities
    }

    all_integrations = integration_service.get_integrations(
        organization_id=organization.id,
        status=ObjectStatus.ACTIVE,
        org_integration_status=ObjectStatus.ACTIVE,
        limit=None,
        providers=[EXTERNAL_PROVIDERS[provider]],
    )
    all_external_ids = [identity_id_to_idp[identity.id].external_id for identity in identities]

    integrations = [i for i in all_integrations if i.external_id in all_external_ids]

    channels_to_integration = {}
    for identity in identities:
        for integration in integrations:
            idp = identity_id_to_idp[identity.id]
            if idp and idp.external_id == integration.external_id:
                channels_to_integration[identity.external_id] = integration
                break

    return channels_to_integration


def _get_channel_and_integration_by_team(
    team_actor_id: int, organization: Organization, provider: ExternalProviders
) -> Mapping[str, Integration]:
    try:
        external_actor = (
            ExternalActor.objects.filter(
                provider=provider.value,
                actor_id=team_actor_id,
                organization=organization,
                integration__status=ObjectStatus.ACTIVE,
                integration__organizationintegration__status=ObjectStatus.ACTIVE,
                # limit to org here to prevent multiple query results
                integration__organizationintegration__organization=organization,
            )
            .select_related("integration")
            .get()
        )
    except ExternalActor.DoesNotExist:
        return {}
    return {external_actor.external_id: external_actor.integration}


def get_integrations_by_channel_by_recipient(
    organization: Organization,
    recipients: Iterable[RpcActor | Team | User],
    provider: ExternalProviders,
) -> Mapping[RpcActor, Mapping[str, RpcIntegration | Integration]]:
    output: MutableMapping[RpcActor, Mapping[str, RpcIntegration | Integration]] = defaultdict(dict)
    for recipient in (RpcActor.from_object(r) for r in recipients):
        channels_to_integrations = None
        if recipient.actor_type == ActorType.USER:
            channels_to_integrations = _get_channel_and_integration_by_user(
                recipient.id, organization, provider
            )
        elif recipient.actor_type == ActorType.TEAM and recipient.actor_id is not None:
            channels_to_integrations = _get_channel_and_integration_by_team(
                recipient.actor_id, organization, provider
            )
        if channels_to_integrations is not None:
            output[recipient] = channels_to_integrations
    return output
