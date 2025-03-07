import {Location} from 'history';

import {initializeOrg} from 'sentry-test/initializeOrg';
import {render, screen} from 'sentry-test/reactTestingLibrary';

import {PRODUCT} from 'sentry/components/onboarding/productSelection';
import {ReactDocVariant} from 'sentry/data/platforms';
import {PersistedStoreContext} from 'sentry/stores/persistedStore';
import ProjectsStore from 'sentry/stores/projectsStore';
import {Organization, Project} from 'sentry/types';
import SetupDocs from 'sentry/views/onboarding/setupDocs';

function renderMockRequests({
  project,
  orgSlug,
  location,
}: {
  orgSlug: Organization['slug'];
  project: Project;
  location?: Location;
}) {
  MockApiClient.addMockResponse({
    url: `/projects/${orgSlug}/${project.slug}/`,
    body: project,
  });

  MockApiClient.addMockResponse({
    url: `/projects/${orgSlug}/${project.slug}/issues/`,
    body: [],
  });

  if (project.slug === 'javascript-react') {
    const products = location?.query.product ?? [];
    if (
      products.includes(PRODUCT.PERFORMANCE_MONITORING) &&
      products.includes(PRODUCT.SESSION_REPLAY)
    ) {
      MockApiClient.addMockResponse({
        url: `/projects/${orgSlug}/${project.slug}/docs/${ReactDocVariant.ErrorMonitoringPerformanceAndReplay}/`,
        body: {html: ReactDocVariant.ErrorMonitoringPerformanceAndReplay},
      });
    } else if (products.includes(PRODUCT.PERFORMANCE_MONITORING)) {
      MockApiClient.addMockResponse({
        url: `/projects/${orgSlug}/${project.slug}/docs/${ReactDocVariant.ErrorMonitoringAndPerformance}/`,
        body: {html: ReactDocVariant.ErrorMonitoringAndPerformance},
      });
    } else if (products.includes(PRODUCT.SESSION_REPLAY)) {
      MockApiClient.addMockResponse({
        url: `/projects/${orgSlug}/${project.slug}/docs/${ReactDocVariant.ErrorMonitoringAndSessionReplay}/`,
        body: {html: ReactDocVariant.ErrorMonitoringAndSessionReplay},
      });
    } else {
      MockApiClient.addMockResponse({
        url: `/projects/${orgSlug}/${project.slug}/docs/${ReactDocVariant.ErrorMonitoring}/`,
        body: {html: ReactDocVariant.ErrorMonitoring},
      });
    }
  } else {
    MockApiClient.addMockResponse({
      url: `/projects/${orgSlug}/${project.slug}/docs/${project.platform}/`,
      body: {html: ''},
    });
  }
}

describe('Onboarding Setup Docs', function () {
  it('does not render Product Selection', async function () {
    const {router, route, routerContext, organization, project} = initializeOrg({
      ...initializeOrg(),
      organization: {
        ...initializeOrg().organization,
        features: [
          'onboarding-remove-multiselect-platform',
          'onboarding-docs-with-product-selection',
        ],
      },
      projects: [
        {
          ...initializeOrg().project,
          slug: 'python',
          platform: 'python',
        },
      ],
    });

    ProjectsStore.init();
    ProjectsStore.loadInitialData([project]);

    renderMockRequests({project, orgSlug: organization.slug});

    render(
      <PersistedStoreContext.Provider
        value={[
          {
            onboarding: {
              selectedPlatforms: ['python'],
              platformToProjectIdMap: {
                python: 'python',
              },
            },
          },
          jest.fn(),
        ]}
      >
        <SetupDocs
          active
          onComplete={() => {}}
          stepIndex={2}
          router={router}
          route={route}
          location={router.location}
          genSkipOnboardingLink={() => ''}
          orgId={organization.slug}
          jumpToSetupProject={() => {}}
          search=""
        />
      </PersistedStoreContext.Provider>,
      {
        context: routerContext,
        organization,
      }
    );

    expect(
      await screen.findByRole('heading', {name: 'Configure Python SDK'})
    ).toBeInTheDocument();

    expect(
      screen.queryByTestId(
        `product-${PRODUCT.ERROR_MONITORING}-${PRODUCT.PERFORMANCE_MONITORING}-${PRODUCT.SESSION_REPLAY}`
      )
    ).not.toBeInTheDocument();
  });

  describe('renders Product Selection', function () {
    it('all products checked', async function () {
      const {router, route, routerContext, organization, project} = initializeOrg({
        ...initializeOrg(),
        organization: {
          ...initializeOrg().organization,
          features: [
            'onboarding-remove-multiselect-platform',
            'onboarding-docs-with-product-selection',
          ],
        },
        router: {
          location: {
            query: {product: [PRODUCT.PERFORMANCE_MONITORING, PRODUCT.SESSION_REPLAY]},
          },
        },
        projects: [
          {
            ...initializeOrg().project,
            slug: 'javascript-react',
            platform: 'javascript-react',
          },
        ],
      });

      ProjectsStore.init();
      ProjectsStore.loadInitialData([project]);

      renderMockRequests({
        project,
        orgSlug: organization.slug,
        location: router.location,
      });

      render(
        <PersistedStoreContext.Provider
          value={[
            {
              onboarding: {
                selectedPlatforms: ['javascript-react'],
                platformToProjectIdMap: {
                  'javascript-react': 'javascript-react',
                },
              },
            },
            jest.fn(),
          ]}
        >
          <SetupDocs
            active
            onComplete={() => {}}
            stepIndex={2}
            router={router}
            route={route}
            location={router.location}
            genSkipOnboardingLink={() => ''}
            orgId={organization.slug}
            jumpToSetupProject={() => {}}
            search=""
          />
        </PersistedStoreContext.Provider>,
        {
          context: routerContext,
          organization,
        }
      );

      expect(
        await screen.findByRole('heading', {name: 'Configure React SDK'})
      ).toBeInTheDocument();

      // Render variation of docs - default (all checked)
      expect(
        await screen.findByText(ReactDocVariant.ErrorMonitoringPerformanceAndReplay)
      ).toBeInTheDocument();
    });

    it('only performance checked', async function () {
      const {router, route, routerContext, organization, project} = initializeOrg({
        ...initializeOrg(),
        organization: {
          ...initializeOrg().organization,
          features: [
            'onboarding-remove-multiselect-platform',
            'onboarding-docs-with-product-selection',
          ],
        },
        router: {
          location: {
            query: {product: [PRODUCT.PERFORMANCE_MONITORING]},
          },
        },
        projects: [
          {
            ...initializeOrg().project,
            slug: 'javascript-react',
            platform: 'javascript-react',
          },
        ],
      });

      ProjectsStore.init();
      ProjectsStore.loadInitialData([project]);

      renderMockRequests({
        project,
        orgSlug: organization.slug,
        location: router.location,
      });

      render(
        <PersistedStoreContext.Provider
          value={[
            {
              onboarding: {
                selectedPlatforms: ['javascript-react'],
                platformToProjectIdMap: {
                  'javascript-react': 'javascript-react',
                },
              },
            },
            jest.fn(),
          ]}
        >
          <SetupDocs
            active
            onComplete={() => {}}
            stepIndex={2}
            router={router}
            route={route}
            location={router.location}
            genSkipOnboardingLink={() => ''}
            orgId={organization.slug}
            jumpToSetupProject={() => {}}
            search=""
          />
        </PersistedStoreContext.Provider>,
        {
          context: routerContext,
          organization,
        }
      );

      // Render variation of docs - error monitoring and performance doc
      expect(
        await screen.findByText(ReactDocVariant.ErrorMonitoringAndPerformance)
      ).toBeInTheDocument();
    });

    it('only session replay checked', async function () {
      const {router, route, routerContext, organization, project} = initializeOrg({
        ...initializeOrg(),
        organization: {
          ...initializeOrg().organization,
          features: [
            'onboarding-remove-multiselect-platform',
            'onboarding-docs-with-product-selection',
          ],
        },
        router: {
          location: {
            query: {product: [PRODUCT.SESSION_REPLAY]},
          },
        },
        projects: [
          {
            ...initializeOrg().project,
            slug: 'javascript-react',
            platform: 'javascript-react',
          },
        ],
      });

      ProjectsStore.init();
      ProjectsStore.loadInitialData([project]);

      renderMockRequests({
        project,
        orgSlug: organization.slug,
        location: router.location,
      });

      render(
        <PersistedStoreContext.Provider
          value={[
            {
              onboarding: {
                selectedPlatforms: ['javascript-react'],
                platformToProjectIdMap: {
                  'javascript-react': 'javascript-react',
                },
              },
            },
            jest.fn(),
          ]}
        >
          <SetupDocs
            active
            onComplete={() => {}}
            stepIndex={2}
            router={router}
            route={route}
            location={router.location}
            genSkipOnboardingLink={() => ''}
            orgId={organization.slug}
            jumpToSetupProject={() => {}}
            search=""
          />
        </PersistedStoreContext.Provider>,
        {
          context: routerContext,
          organization,
        }
      );

      // Render variation of docs - error monitoring and replay doc
      expect(
        await screen.findByText(ReactDocVariant.ErrorMonitoringAndSessionReplay)
      ).toBeInTheDocument();
    });

    it('only error monitoring checked', async function () {
      const {router, route, routerContext, organization, project} = initializeOrg({
        ...initializeOrg(),
        organization: {
          ...initializeOrg().organization,
          features: [
            'onboarding-remove-multiselect-platform',
            'onboarding-docs-with-product-selection',
          ],
        },
        router: {
          location: {
            query: {product: []},
          },
        },
        projects: [
          {
            ...initializeOrg().project,
            slug: 'javascript-react',
            platform: 'javascript-react',
          },
        ],
      });

      ProjectsStore.init();
      ProjectsStore.loadInitialData([project]);

      renderMockRequests({
        project,
        orgSlug: organization.slug,
        location: router.location,
      });

      render(
        <PersistedStoreContext.Provider
          value={[
            {
              onboarding: {
                selectedPlatforms: ['javascript-react'],
                platformToProjectIdMap: {
                  'javascript-react': 'javascript-react',
                },
              },
            },
            jest.fn(),
          ]}
        >
          <SetupDocs
            active
            onComplete={() => {}}
            stepIndex={2}
            router={router}
            route={route}
            location={router.location}
            genSkipOnboardingLink={() => ''}
            orgId={organization.slug}
            jumpToSetupProject={() => {}}
            search=""
          />
        </PersistedStoreContext.Provider>,
        {
          context: routerContext,
          organization,
        }
      );

      // Render variation of docs - error monitoring doc
      expect(
        await screen.findByText(ReactDocVariant.ErrorMonitoring)
      ).toBeInTheDocument();
    });
  });
});
