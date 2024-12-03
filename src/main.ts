import { Actor } from 'apify';
import { Dataset, log, PlaywrightCrawler, sleep } from 'crawlee';

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
    requestHandler: async ({ page, request }) => {
        const { url } = request;
        let number = null;
        if (url.includes('recruiting.ultipro.com')) {
            const foundNumber = await page.evaluate(() => {
                return document.querySelector('[data-automation="opportunities-count"]')?.innerHTML.split('of')[1].replace(/[^0-9.]/g, '');
            });

            number = Number(foundNumber) || 0;
        }

        if (url.includes('bawc.com')) {
            number = 1;
        }

        if (url.includes('careers.joveo.com')) {
            const foundNumber = await page.evaluate(() => {
                return document.querySelector('h6.mui-style-d6f2o4')?.innerHTML.replace(/[^0-9.]/g, '');
            });

            number = Number(foundNumber) || 0;
        }

        if (url.includes('epitec.com')) {
            const foundNumber = await page.evaluate(() => {
                return document.querySelectorAll('.job-listings__job')?.length;
            });

            number = Number(foundNumber) || 0;
        }
        if (url.includes('jobs.jobvite.com')) {
            const foundNumber = await page.evaluate(() => {
                return document.querySelectorAll('.jv-job-list-name')?.length;
            });

            number = Number(foundNumber) || 0;
        }

        await Dataset.pushData({
            url,
            number,
        });
    },
    errorHandler: async ({ session }) => {
        session?.retire();
    },
});

await crawler.run(startUrls);

await Actor.exit();
