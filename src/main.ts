import { Actor } from 'apify';
import { Dataset, PlaywrightCrawler, sleep } from 'crawlee';
import { clickOnLoadMoreButtonWhilePresent, getNumberBySelectorCount, getNumberFromMixedString, scrollToTheBottom } from './utils.js';

interface Input {
    startUrls: string[];
    maxRequestsPerCrawl: number;
}

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
    navigationTimeoutSecs: 90,
    requestHandlerTimeoutSecs: 999999,
    preNavigationHooks: [async (_, gotoOptions) => {
        gotoOptions!.waitUntil = 'networkidle';
    }],
    requestHandler: async ({ page, request }) => {
        const { url } = request;
        let number = null;
        let method = '';

        if (url.includes('recruiting.ultipro.com')) {
            await sleep(10_000);
            number = getNumberFromMixedString(page, '[data-automation="opportunities-count"]');
            method = 'Found on page.';
        }

        if (url.includes('bawc.com')) {
            number = 1;
            method = 'Set manually.';
        }

        if (url.includes('careers.joveo.com')) {
            number = await getNumberFromMixedString(page, 'h6.mui-style-d6f2o4');
            method = 'Found on page.';
        }

        if (url.includes('epitec.com')) {
            number = await getNumberBySelectorCount(page, '.job-listings__job');
            method = 'Based on selectors count.';
        }

        if (url.includes('yorkemployment.com') || url.includes('burnettspecialists.com')) {
            await scrollToTheBottom(page);
            number = await getNumberBySelectorCount(page, '.job-post-row');
            method = 'Automated loading of whole list by scrolling, count based on selectors count.';
        }

        if (url.includes('jobs.jobvite.com')) {
            number = await getNumberBySelectorCount(page, '.jv-job-list-name');
            method = 'Based on selectors count.';
        }

        if (url.includes('m-v-t.com')) {
            await page.waitForSelector('.job_listing', { timeout: 60_000 });
            await clickOnLoadMoreButtonWhilePresent(page, '.load_more_jobs');
            await sleep(2_000);
            number = await getNumberBySelectorCount(page, '.job_listing');
            method = 'Automated loading of whole list by button clicks, count based on selectors count.';
        }
        await Dataset.pushData({
            url,
            number,
            method,
        });
    },
    errorHandler: async ({ session }) => {
        session?.retire();
    },
});

await crawler.run(startUrls);

await Actor.exit();
