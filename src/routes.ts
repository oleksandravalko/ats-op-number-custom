import { createPlaywrightRouter, Dataset, log, sleep } from 'crawlee';
import { REQUEST_LABELS } from './contstants.js';
import {
    clickOnLoadMoreButtonWhilePresent, getJobsCountByCrawlingThroughConsequentPages,
    getNextPageUrlFromSelector,
    getNumberBySelectorCount,
    getNumberFromMixedString, pushToDataset,
    scrollToTheBottom,
} from './utils.js';
import { NextPageCrawlingData, NextPageRequest } from './types.js';

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
        number = await getJobsCountByCrawlingThroughConsequentPages(
            page,
            {
                domain: 'epitec.com',
                startUrl: url,
                positionSelector: '.job-listings__job',
                nextButtonSelector: '.archive-pagination__next a',
            },
            crawler);

        if (number) await pushToDataset(url, number, 'Crawled through consequent pages counting positions.');
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
    const number = await getJobsCountByCrawlingThroughConsequentPages(
        page,
        request.userData as NextPageCrawlingData,
        crawler,
    );
    if (number) await pushToDataset(request.userData.startUrl, number, 'Crawled through consequent pages counting positions.');
});
