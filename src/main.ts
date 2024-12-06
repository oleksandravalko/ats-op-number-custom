import { Actor } from 'apify';
import { PlaywrightCrawler } from 'crawlee';
import { router } from './routes.js';
import { REQUEST_LABELS } from './contstants.js';
import { Input, Request } from './types.js';

await Actor.init();

const {
    startUrls,
    maxRequestsPerCrawl = 100,
} = await Actor.getInput<Input>() ?? {} as Input;

const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: ['RESIDENTIAL'],
    countryCode: 'US',
});

const crawler = new PlaywrightCrawler({
    maxRequestsPerCrawl,
    proxyConfiguration,
    headless: false,
    navigationTimeoutSecs: 180,
    requestHandlerTimeoutSecs: 999999,
    preNavigationHooks: [async (_, gotoOptions) => {
        gotoOptions!.waitUntil = 'networkidle';
    }],
    requestHandler: router,
    errorHandler: async ({ session }) => {
        session?.retire();
    },
});

const startRequest:Request[] = [];
startUrls.forEach((url) => startRequest.push(
    {
        ...url,
        label: REQUEST_LABELS.START,
    },
));

await crawler.run(startRequest);

await Actor.exit();
