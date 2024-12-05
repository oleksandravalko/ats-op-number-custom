import { createPlaywrightRouter, Dataset, log, sleep } from 'crawlee';
import { REQUEST_LABELS } from './contstants.js';
import {
    clickOnLoadMoreButtonWhilePresent,
    getNextPageUrlFromSelector,
    getNumberBySelectorCount,
    getNumberFromMixedString, pushToDataset,
    scrollToTheBottom,
} from './utils.js';
import { NextPageRequest } from './types.js';

export const router = createPlaywrightRouter();

router.addHandler(REQUEST_LABELS.START, async ({ crawler, page, request }) => {
    const { url } = request;
    let number = null;
    let method = '';

    if (url.includes('recruiting.ultipro.com')) {
        await sleep(10_000);
        number = await getNumberFromMixedString(page, '[data-automation="opportunities-count"]');
        method = 'Found on page.';
        await pushToDataset(url, number, method);
    }

    if (url.includes('bawc.com')) {
        number = 1;
        method = 'Set manually.';
        await pushToDataset(url, number, method);
    }

    if (url.includes('careers.joveo.com')) {
        number = await getNumberFromMixedString(page, 'h6.mui-style-d6f2o4');
        method = 'Found on page.';
        await pushToDataset(url, number, method);
    }

    if (url.includes('epitec.com')) {
        const positionSelector = '.job-listings__job';
        const nextButtonSelector = '.archive-pagination__next a';
        const domain = 'epitec.com';

        const jobsCountOnFirstPage = await getNumberBySelectorCount(page, positionSelector);

        const hrefOfNextPageButton = await getNextPageUrlFromSelector(page, nextButtonSelector);

        if (hrefOfNextPageButton) {
            const nextPageUrl = `https://${domain}${hrefOfNextPageButton}`;

            const nextPageRequest:NextPageRequest = {
                url: nextPageUrl,
                label: REQUEST_LABELS.NEXT,
                userData: {
                    domain,
                    startUrl: url,
                    jobsCount: jobsCountOnFirstPage,
                    positionSelector,
                    nextButtonSelector,
                },
            };

            await crawler.addRequests([nextPageRequest]);
            return;
        }

        await pushToDataset(url, jobsCountOnFirstPage, 'Crawled through consequent pages counting positions.');
    }

    if (url.includes('yorkemployment.com') || url.includes('burnettspecialists.com')) {
        await scrollToTheBottom(page);
        number = await getNumberBySelectorCount(page, '.job-post-row');
        method = 'Automated loading of whole list by scrolling, count based on selectors count.';
        await pushToDataset(url, number, method);
    }

    if (url.includes('jobs.jobvite.com')) {
        number = await getNumberBySelectorCount(page, '.jv-job-list-name');
        method = 'Based on selectors count.';
        await pushToDataset(url, number, method);
    }

    if (url.includes('m-v-t.com')) {
        await page.waitForSelector('.job_listing', { timeout: 60_000 });
        await clickOnLoadMoreButtonWhilePresent(page, '.load_more_jobs');
        await sleep(2_000);
        number = await getNumberBySelectorCount(page, '.job_listing');
        method = 'Automated loading of whole list by button clicks, count based on selectors count.';
        await pushToDataset(url, number, method);
    }
});

router.addHandler(REQUEST_LABELS.NEXT, async ({ page, request, crawler }) => {
    const { domain, startUrl, jobsCount, positionSelector, nextButtonSelector } = request.userData;

    const jobsCountOnCurrentPage = await getNumberBySelectorCount(page, positionSelector);
    const newJobsCount = jobsCount + jobsCountOnCurrentPage;

    const hrefOfNextPageButton = await getNextPageUrlFromSelector(page, nextButtonSelector);
    if (hrefOfNextPageButton) {
        const nextPageUrl = domain ? `https://${domain}${hrefOfNextPageButton}` : hrefOfNextPageButton;

        const nextPageRequest:NextPageRequest = {
            url: nextPageUrl,
            label: REQUEST_LABELS.NEXT,
            userData: {
                domain,
                startUrl,
                jobsCount: newJobsCount,
                positionSelector,
                nextButtonSelector,
            },
        };

        await crawler.addRequests([nextPageRequest]);
        return;
    }

    await pushToDataset(startUrl, newJobsCount, 'Crawled through consequent pages counting positions.');
});
