import {Fragment, ReactChild, useEffect} from 'react';
import styled from '@emotion/styled';

import KeyValueList from 'sentry/components/events/interfaces/keyValueList';
import {GroupPreviewHovercard} from 'sentry/components/groupPreviewTooltip/groupPreviewHovercard';
import {useDelayedLoadingState} from 'sentry/components/groupPreviewTooltip/utils';
import LoadingIndicator from 'sentry/components/loadingIndicator';
import {t} from 'sentry/locale';
import {space} from 'sentry/styles/space';
import {EventTransaction} from 'sentry/types';
import {useApiQuery} from 'sentry/utils/queryClient';
import useOrganization from 'sentry/utils/useOrganization';

type SpanEvidencePreviewProps = {
  children: ReactChild;
  eventId?: string;
  groupId?: string;
  projectSlug?: string;
};

type SpanEvidencePreviewBodyProps = {
  endpointUrl: string;
  onRequestBegin: () => void;
  onRequestEnd: () => void;
  onUnmount: () => void;
};

const makeGroupPreviewRequestUrl = ({
  orgSlug,
  eventId,
  groupId,
  projectSlug,
}: {
  orgSlug: string;
  eventId?: string;
  groupId?: string;
  projectSlug?: string;
}) => {
  if (eventId && projectSlug) {
    return `/projects/${orgSlug}/${projectSlug}/events/${eventId}/`;
  }

  if (groupId) {
    return `/issues/${groupId}/events/latest/`;
  }

  return null;
};

const SpanEvidencePreviewBody = ({
  endpointUrl,
  onRequestBegin,
  onRequestEnd,
  onUnmount,
}: SpanEvidencePreviewBodyProps) => {
  const {data, isLoading, isError} = useApiQuery<EventTransaction>(
    [endpointUrl, {query: {referrer: 'api.issues.preview-performance'}}],
    {staleTime: 60000}
  );

  useEffect(() => {
    if (isLoading) {
      onRequestBegin();
    } else {
      onRequestEnd();
    }

    return onUnmount;
  }, [isLoading, onRequestBegin, onRequestEnd, onUnmount]);

  if (isLoading) {
    return (
      <EmptyWrapper>
        <LoadingIndicator hideMessage size={32} />
      </EmptyWrapper>
    );
  }

  if (isError) {
    return <EmptyWrapper>{t('Failed to load preview')}</EmptyWrapper>;
  }

  const evidenceDisplay = data?.occurrence?.evidenceDisplay;

  if (evidenceDisplay?.length) {
    return (
      <SpanEvidencePreviewWrapper data-test-id="evidence-preview-body">
        <KeyValueList
          data={evidenceDisplay.map(item => ({
            key: item.name,
            subject: item.name,
            value: item.value,
          }))}
          shouldSort={false}
        />
      </SpanEvidencePreviewWrapper>
    );
  }

  return (
    <EmptyWrapper>{t('There is no evidence available for this issue.')}</EmptyWrapper>
  );
};

export const EvidencePreview = ({
  children,
  groupId,
  eventId,
  projectSlug,
}: SpanEvidencePreviewProps) => {
  const organization = useOrganization();
  const endpointUrl = makeGroupPreviewRequestUrl({
    groupId,
    eventId,
    projectSlug,
    orgSlug: organization.slug,
  });
  const {shouldShowLoadingState, onRequestBegin, onRequestEnd, reset} =
    useDelayedLoadingState();

  if (!endpointUrl) {
    return <Fragment>{children}</Fragment>;
  }

  return (
    <GroupPreviewHovercard
      hide={!shouldShowLoadingState}
      body={
        <SpanEvidencePreviewBody
          onRequestBegin={onRequestBegin}
          onRequestEnd={onRequestEnd}
          onUnmount={reset}
          endpointUrl={endpointUrl}
        />
      }
    >
      {children}
    </GroupPreviewHovercard>
  );
};

const EmptyWrapper = styled('div')`
  color: ${p => p.theme.subText};
  padding: ${space(1.5)};
  font-size: ${p => p.theme.fontSizeMedium};
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 56px;
`;

const SpanEvidencePreviewWrapper = styled('div')`
  width: 700px;
  padding: ${space(1.5)} ${space(1.5)} 0 ${space(1.5)};
`;
