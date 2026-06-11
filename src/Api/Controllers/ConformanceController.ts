import { Hono } from 'hono'

/** Conformance declaration for spec alignment and extensions. */
export function createConformanceController() {
  const app = new Hono()

  app.get('/v1/system/conformance', (c) => {
    return c.json({
      product: {
        name: 'BunEHR',
        version: '1.0.0',
      },
      standards: {
        organisation: 'openEHR Foundation',
        website: 'https://openehr.org/',
        githubOrganisation: 'https://github.com/openEHR',
        coreRestSpec: 'https://specifications.openehr.org/releases/ITS-REST/latest/',
      },
      implementedResources: [
        'EHR',
        'EHR_STATUS',
        'COMPOSITION',
        'CONTRIBUTION',
        'DIRECTORY',
        'QUERY',
        'DEFINITION',
      ],
      extensionNamespaces: [
        { prefix: '/api', purpose: 'UI-facing convenience APIs and seed endpoints' },
        { prefix: '/v1/finance', purpose: 'Clinical finance and ledger extensions' },
        { prefix: '/v1/prescriptions', purpose: 'Prescription workflow extensions' },
      ],
      conformancePolicy: {
        canonicalOpenEhrPayloadsOnV1: true,
        optimisticConcurrencyViaIfMatch: true,
        appendOnlyVersioningForClinicalObjects: true,
        extensionIsolationFromCore: true,
      },
    })
  })

  return app
}
