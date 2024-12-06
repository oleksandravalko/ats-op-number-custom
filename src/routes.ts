import { createPlaywrightRouter, log, sleep } from 'crawlee';
import { REQUEST_LABELS } from './contstants.js';
import {
    clickOnLoadMoreButtonWhilePresent,
    getJobsCountByCrawlingThroughConsequentPages,
    getNumberBySelectorCount,
    getNumberFromMixedString,
    pushToDataset,
    scrollToTheBottom,
} from './utils.js';
import type { LastPageCrawlingData, LastPageRequest, NextPageCrawlingData } from './types.js';

export const router = createPlaywrightRouter();

router.addHandler(REQUEST_LABELS.START, async ({ crawler, page, request }) => {
    const { url } = request;
    const parsedUrl = new URL(url);
    const domain = parsedUrl.hostname;

    let jobsCount: number|null = null;
    let method = '';

    if (url.includes('recruiting.ultipro.com')) {
        await sleep(10_000);
        jobsCount = await getNumberFromMixedString(page, '[data-automation="opportunities-count"]');
        method = 'Found on page.';
        await pushToDataset(url, jobsCount, method);
    }

    if (url.includes('careers.joveo.com')) {
        jobsCount = await getNumberFromMixedString(page, 'h6.mui-style-d6f2o4');
        method = 'Found on page.';
        await pushToDataset(url, jobsCount, method);
    }

    if (url.includes('bawc.com')) {
        jobsCount = 1;
        method = 'Set manually.';
        await pushToDataset(url, jobsCount, method);
    }

    if (/epitec.com/.test(domain)) {
        const foundNumber = await getJobsCountByCrawlingThroughConsequentPages(
            page,
            {
                domain,
                startUrl: url,
                positionSelector: '.job-listings__job',
                nextButtonSelector: '.archive-pagination__next a',
            },
            crawler);

        if (!foundNumber) {
            return;
        }
        await pushToDataset(url, foundNumber, 'Crawled through consequent pages counting positions.');
    }

    if (/yorkemployment.com/.test(domain) || /burnettspecialists.com/.test(domain) || /selectek.com/.test(domain) || /dwsimpson.com/.test(domain)) {
        await scrollToTheBottom(page);
        jobsCount = await getNumberBySelectorCount(page, '.job-post-row');
        method = 'Automated loading of whole list by scrolling, count based on selectors count.';
        await pushToDataset(url, jobsCount, method);
    }

    if (url.includes('jobs.jobvite.com')) {
        jobsCount = await getNumberBySelectorCount(page, '.jv-job-list-name');
        method = 'Based on selectors count.';
        await pushToDataset(url, jobsCount, method);
    }

    if (/stutsmans.com/.test(domain)) {
        const frameLocator = page.frameLocator('#gnewtonIframe');
        if (await frameLocator.locator('#gnewtonCareerHome').isVisible({ timeout: 120_000 })) {
            jobsCount = await frameLocator.locator('.gnewtonJobLink')?.count();
            method = 'Based on selectors count.';
        }
        await pushToDataset(url, jobsCount, method);
    }

    if (/oppenheimer.com/.test(domain)) {
        const frameLocator = page.frameLocator('#inlineframe');
        jobsCount = await frameLocator.locator('.jobListItem').count();
        method = 'Based on selectors count.';
        await pushToDataset(url, jobsCount, method);
    }

    if (/talkspace.com/.test(domain)) {
        const frameLocator = page.frameLocator('#grnhse_iframe');
        jobsCount = await frameLocator.locator('.opening').count();
        method = 'Based on selectors count.';
        await pushToDataset(url, jobsCount, method);
    }

    if (/supplyhouse.com/.test(domain)) {
        jobsCount = await getNumberBySelectorCount(page, '.pos-item');
        method = 'Based on selectors count.';
        await pushToDataset(url, jobsCount, method);
    }

    if (/ssemploymentpartners.com/.test(domain)) {
        await crawler.addRequests([
            {
                url: 'https://www2.pcrecruiter.net/pcrbin/jobboard.aspx?uid=ss%20employment%20partners%20.ssemploymentpartners',
                label: REQUEST_LABELS.ALTERNATIVE,
                userData: {
                    startUrl: url,
                },
            },
        ]);
    }

    if (/gtstaffing.com/.test(domain)) {
        await crawler.addRequests([
            {
                url: 'https://gtstaffing.com/careers/#/jobs',
                label: REQUEST_LABELS.ALTERNATIVE,
                userData: {
                    startUrl: url,
                },
            },
        ]);
    }

    if (url.includes('m-v-t.com')) {
        await page.waitForSelector('.job_listing', { timeout: 60_000 });
        await clickOnLoadMoreButtonWhilePresent(page, '.load_more_jobs');
        await sleep(2_000);
        jobsCount = await getNumberBySelectorCount(page, '.job_listing');
        method = 'Automated loading of whole list by button clicks, count based on selectors count.';
        await pushToDataset(url, jobsCount, method);
    }

    if (/velosource.com/.test(domain)) {
        await page.waitForSelector('[role="listitem"]', { timeout: 60_000 });
        await clickOnLoadMoreButtonWhilePresent(page, '[aria-label="Load More"]');
        await sleep(2_000);
        jobsCount = await getNumberBySelectorCount(page, '[role="listitem"]');
        method = 'Automated loading of whole list by button clicks, count based on selectors count.';
        await pushToDataset(url, jobsCount, method);
    }

    if (/careeradvancers.com/.test(domain)) {
        await page.waitForSelector('.recruiterwp-jobs-col', { timeout: 60_000 });
        await clickOnLoadMoreButtonWhilePresent(page, '.facetwp-load-more');
        await sleep(2_000);
        jobsCount = await getNumberBySelectorCount(page, '.job-listing-item');
        method = 'Automated loading of whole list by button clicks, count based on selectors count.';
        await pushToDataset(url, jobsCount, method);
    }

    if (/dayforcehcm.com/.test(domain)) {
        const maxJobsCountPerPage = await getNumberBySelectorCount(page, 'ant-list-item');

        const lastPageNumber = await page.locator('.ant-pagination-item').last().getAttribute('title'); // last page button

        if (lastPageNumber) {
            const lastPageParsedUrl = { ...parsedUrl };
            lastPageParsedUrl.searchParams.set('page', lastPageNumber);

            await crawler.addRequests([
                {
                    url: lastPageParsedUrl.toString(),
                    label: REQUEST_LABELS.LAST,
                    userData: {
                        startUrl: url,
                        maxJobsCountPerPage,
                        positionSelector: '.ant-list-item',
                        paginationItemSelector: '.ant-pagination-item',
                    } as LastPageCrawlingData,
                } as LastPageRequest,
            ]);
            log.info(lastPageNumber);
        }
        // await lastPageLocator.highlight();
        // if (await lastPageLocator.isVisible()) {
        //     await lastPageLocator.click();
        // }
        // await page.waitForSelector('.ant-pagination');
        // const newLastLocatorTitle = await page.locator('.ant-pagination-item').last().getAttribute('title');
        // log.info(newLastLocatorTitle);
        // if (lastPageNumber === newLastLocatorTitle) {
        //     log.info('same');
        // }
        // await sleep(30_000);
    }
});

router.addHandler(REQUEST_LABELS.NEXT, async ({ page, request, crawler }) => {
    const jobsCount = await getJobsCountByCrawlingThroughConsequentPages(
        page,
        request.userData as NextPageCrawlingData,
        crawler,
    );
    if (!jobsCount) {
        return;
    }
    await pushToDataset(request.userData.startUrl, jobsCount, 'Crawled through consequent pages counting positions.');
});

router.addHandler(REQUEST_LABELS.LAST, async ({ page, request }) => {
    const { url, userData } = request;
    const currentPageNumber = Number(new URL(url).searchParams.get('page'));
    const lastPageNumber = Number(await page.locator(userData.paginationItemSelector).last().getAttribute('title'));
    let jobsCount = null;

    if (currentPageNumber && currentPageNumber === lastPageNumber) {
        const jobsCountOnCurrentPage = await getNumberBySelectorCount(page, 'positionSelector');
        const jobsCountOnPreviousPages = userData.maxJobsCountPerPage * (currentPageNumber - 1);
        jobsCount = jobsCountOnCurrentPage + jobsCountOnPreviousPages;
    }
    if (typeof jobsCount !== 'undefined') await pushToDataset(userData.startUrl, jobsCount, 'Jumped to the last page and calculated jobs.');
});

router.addHandler(REQUEST_LABELS.ALTERNATIVE, async ({ page, request }) => {
    const { url, userData } = request;
    let jobsCount = null;
    let method = 'Got number from alternative page.';

    if (/ssemploymentpartners/.test(url)) {
        const foundNumber = await page.evaluate(() => {
            return document.querySelector('#resultcount')?.innerHTML.split('of')[1].replace(/\s/g, ''); // e.g. "1-12 of 13"
        });
        jobsCount = Number(foundNumber);
    }

    if (/gtstaffing/.test(url)) {
        await page.waitForSelector('.job-list', { timeout: 60_000 });
        await clickOnLoadMoreButtonWhilePresent(page, '.load-more-data');
        await sleep(2_000);
        jobsCount = await getNumberBySelectorCount(page, '.slide-up-item');
        method += ' Automated loading of whole list by button clicks, count based on selectors count.';
    }

    await pushToDataset(userData.startUrl, jobsCount, method);
});
