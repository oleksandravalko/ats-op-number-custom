import { Actor } from 'apify';
import { Dataset, PlaywrightCrawler, sleep } from 'crawlee';

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
    // groups: ['RESIDENTIAL'],
    // countryCode: 'US',
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
            const foundNumber = await page.evaluate(() => {
                return document.querySelector('[data-automation="opportunities-count"]')?.innerHTML.split('of')[1].replace(/[^0-9.]/g, '');
            });

            number = Number(foundNumber) || 0;
            method = 'Found on page.';
        }

        if (url.includes('bawc.com')) {
            number = 1;
            method = 'Set manually.';
        }

        if (url.includes('careers.joveo.com')) {
            const foundNumber = await page.evaluate(() => {
                return document.querySelector('h6.mui-style-d6f2o4')?.innerHTML.replace(/[^0-9.]/g, '');
            });

            number = Number(foundNumber) || 0;
            method = 'Found on page.';
        }

        if (url.includes('epitec.com')) {
            const foundNumber = await page.evaluate(() => {
                return document.querySelectorAll('.job-listings__job')?.length;
            });

            number = Number(foundNumber) || 0;
            method = 'Based on selectors count.';
        }

        if (url.includes('yorkemployment.com') || url.includes('burnettspecialists.com')) {
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await sleep(3_000);

            const scrollToTheBottom = async () => {
                const currentHeight = await page.evaluate(() => {
                    const startingHeight = document.body.scrollHeight;
                    window.scrollTo(0, startingHeight);
                    return startingHeight;
                });
                await sleep(3_000);
                const newHeight = await page.evaluate(() => document.body.scrollHeight);
                if (newHeight > currentHeight) {
                    await scrollToTheBottom();
                }
            };

            await scrollToTheBottom();
            const foundNumber = await page.evaluate(() => {
                return document.querySelectorAll('.job-post-row')?.length;
            });

            number = Number(foundNumber) || 0;
            method = 'Automated loading of whole list by scrolling, count based on selectors count.';
        }

        if (url.includes('jobs.jobvite.com')) {
            const foundNumber = await page.evaluate(() => {
                return document.querySelectorAll('.jv-job-list-name')?.length;
            });

            number = Number(foundNumber) || 0;
            method = 'Based on selectors count.';
        }

        if (url.includes('m-v-t.com')) {
            const clickOnLoadButton = async () => {
                const locator = page.locator('.load_more_jobs');
                if (locator) {
                    try {
                        await locator.click();
                        await sleep(2_000);
                        await clickOnLoadButton();
                    } catch {
                        //
                    }
                }
            };

            await clickOnLoadButton();
            await sleep(2_000);
            const foundNumber = await page.evaluate(() => {
                return document.querySelectorAll('.job_listing')?.length;
            });

            number = Number(foundNumber) || 0;
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
