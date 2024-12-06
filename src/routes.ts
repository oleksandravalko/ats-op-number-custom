import { createPlaywrightRouter, Dataset, log, RequestQueue, sleep } from 'crawlee';
import { REQUEST_LABELS } from './contstants.js';
import {
    clickOnLoadMoreButtonWhilePresent, getJobsCountByCrawlingThroughConsequentPages,
    getNumberBySelectorCount,
    getNumberFromMixedString, pushToDataset,
    scrollToTheBottom,
} from './utils.js';
import { LastPageCrawlingData, LastPageRequest, NextPageCrawlingData } from './types.js';

export const router = createPlaywrightRouter();

router.addHandler(REQUEST_LABELS.START, async ({ crawler, page, request }) => {
    const { url } = request;
    const parsedUrl = new URL(url);
    const domain = parsedUrl.hostname;

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
                domain,
                startUrl: url,
                positionSelector: '.job-listings__job',
                nextButtonSelector: '.archive-pagination__next a',
            },
            crawler);

        if (number) await pushToDataset(url, number, 'Crawled through consequent pages counting positions.');
    }

    // if (url.includes('mjrecruiters.com')) {
    //     number = await getJobsCountByCrawlingThroughConsequentPages(
    //         page,
    //         {
    //             domain,
    //             startUrl: url,
    //             positionSelector: '.job-box-cont',
    //             nextButtonSelector: '.rw-right-btn a',
    //         },
    //         crawler);
    //
    //     if (number) await pushToDataset(url, number, 'Crawled through consequent pages counting positions.');
    // } too many pages, needs better way

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
    const number = await getJobsCountByCrawlingThroughConsequentPages(
        page,
        request.userData as NextPageCrawlingData,
        crawler,
    );
    if (number) await pushToDataset(request.userData.startUrl, number, 'Crawled through consequent pages counting positions.');
});

router.addHandler(REQUEST_LABELS.LAST, async ({ page, request, crawler }) => {
    const { url, userData } = request;
    const currentPageNumber = Number(new URL(url).searchParams.get('page'));
    const lastPageNumber = Number(await page.locator(userData.paginationItemSelector).last().getAttribute('title'));

    if (currentPageNumber && currentPageNumber === lastPageNumber) {
        const jobsCountOnCurrentPage = await getNumberBySelectorCount(page, 'positionSelector');
        const jobsCountOnPreviousPages = userData.maxJobsCountPerPage * (currentPageNumber - 1);
        const number = jobsCountOnCurrentPage + jobsCountOnPreviousPages;
        if (number) await pushToDataset(request.userData.startUrl, number, 'Crawled through consequent pages counting positions.');
    }
});
