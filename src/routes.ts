import { createPlaywrightRouter, log, sleep } from 'crawlee';
import { REQUEST_LABELS } from './contstants.js';
import {
    clickOnLoadMoreButtonWhilePresent,
    getJobsCountByCrawlingThroughConsequentPages,
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
    }

    if (url.includes('careers.joveo.com')) {
        jobsCount = await getNumberFromMixedString(page, 'h6.mui-style-d6f2o4');
        method = 'Found on page.';
    }

    if (url.includes('bawc.com')) {
        jobsCount = 1;
        method = 'Set manually.';
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
        method = 'Crawled through consequent pages counting positions.';
        jobsCount = foundNumber;
    }

    if (/yorkemployment.com/.test(domain)
        || /burnettspecialists.com/.test(domain)
        || /selectek.com/.test(domain)
        || /dwsimpson.com/.test(domain)
        || /hhstaffingservices.com/.test(domain)
        || /intersolutions.com/.test(domain)
    ) {
        await scrollToTheBottom(page);
        jobsCount = await page.locator('.job-post-row').count();
        method = 'Automated loading of whole list by scrolling, count based on selectors count.';
    }

    if (/jobs.jobvite.com/.test(domain)) {
        jobsCount = await page.locator('.jv-job-list-name').count();
        method = 'Based on selectors count.';
    }

    if (/automate.org/.test(domain)) {
        const dropDownLocator = page.locator('#zipSearch #field1_1');
        if (dropDownLocator) {
            await dropDownLocator.selectOption({ value: '1' });
        }

        const includeRemoteCheckbox = page.locator('#includeRemote');
        if (includeRemoteCheckbox) {
            await includeRemoteCheckbox.check();
        }

        const goButton = page.locator('.gridcol.three button.newsSearch').filter({ hasText: 'GO' });
        if (goButton) {
            await goButton.click();
        }
        await sleep(2_000);

        jobsCount = await page.locator('.job-opening').count();
        method = 'Based on selectors count.';
    }

    if (/stutsmans.com/.test(domain)) {
        const frameLocator = page.frameLocator('#gnewtonIframe');
        if (await frameLocator.locator('#gnewtonCareerHome').isVisible({ timeout: 120_000 })) {
            jobsCount = await frameLocator.locator('.gnewtonJobLink')?.count();
            method = 'Based on selectors count.';
        }
    }

    if (/oppenheimer.com/.test(domain)) {
        const frameLocator = page.frameLocator('#inlineframe');
        jobsCount = await frameLocator.locator('.jobListItem').count();
        method = 'Based on selectors count.';
    }

    if (/talkspace.com/.test(domain)) {
        const frameLocator = page.frameLocator('#grnhse_iframe');
        jobsCount = await frameLocator.locator('.opening').count();
        method = 'Based on selectors count.';
    }

    if (/supplyhouse.com/.test(domain)) {
        jobsCount = await page.locator('.pos-item').count();
        method = 'Based on selectors count.';
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
        return;
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
        return;
    }

    if (url.includes('m-v-t.com')) {
        await page.waitForSelector('.job_listing', { timeout: 60_000 });
        await clickOnLoadMoreButtonWhilePresent(page, '.load_more_jobs');
        await sleep(2_000);
        jobsCount = await page.locator('.job_listing').count();
        method = 'Automated loading of whole list by button clicks, count based on selectors count.';
    }

    if (/velosource.com/.test(domain)) {
        await page.waitForSelector('[role="listitem"]', { timeout: 60_000 });
        await clickOnLoadMoreButtonWhilePresent(page, '[aria-label="Load More"]');
        await sleep(2_000);
        jobsCount = await page.locator('[role="listitem"]').count();
        method = 'Automated loading of whole list by button clicks, count based on selectors count.';
    }

    if (/careeradvancers.com/.test(domain)) {
        await page.waitForSelector('.recruiterwp-jobs-col', { timeout: 60_000 });
        await clickOnLoadMoreButtonWhilePresent(page, '.facetwp-load-more');
        await sleep(2_000);
        jobsCount = await page.locator('.job-listing-item').count();
        method = 'Automated loading of whole list by button clicks, count based on selectors count.';
    }

    if (/monarchlandscape.com/.test(domain)) {
        const frameLocator = page.frameLocator('#inlineframe');
        jobsCount = await frameLocator.locator('tr.ReqRowClick').count();
        method = 'Based on selectors count.';
    }

    if (/managedlaborsolutions.prismhr-hire.com/.test(domain)) {
        jobsCount = await page.locator('.job-container').count();
        method = 'Based on selectors count.';
    }

    if (/dayforcehcm.com/.test(domain)) {
        const maxJobsCountPerPage = await page.locator('ant-list-item').count();

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

    // if (/myavionte.com/.test(domain)) {
    //     const firstPageJobsCount = await page.locator('.jobs-list .job-item').count();
    //     const numberOfPages = await page.locator('.paging-item').count();
    //     if (!numberOfPages || numberOfPages === 1) {
    //         jobsCount = firstPageJobsCount;
    //     }
    //
    //     if (numberOfPages > 1) {
    //         const lastPageButtonLocator = page.locator('.paging-item').last();
    //         await lastPageButtonLocator.scrollIntoViewIfNeeded();
    //
    //         await lastPageButtonLocator.click();
    //         await sleep(2_000);
    //         if ((await lastPageButtonLocator.getAttribute('class'))?.includes('.paging-item-active')) {
    //             const lastPageJobsCount = await page.locator('.jobs-list .job-item').count();
    //             log.info(lastPageJobsCount.toString());
    //             if (lastPageJobsCount) {
    //                 jobsCount = firstPageJobsCount * (numberOfPages - 1);
    //             }
    //         }
    //     } playwright problem: element resolved but unclickable

    await sleep(30_000);
    await pushToDataset(url, jobsCount, method);
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
        const jobsCountOnCurrentPage = await page.locator('positionSelector').count();
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
        method += ' Automated loading of whole list by button clicks, count based on selectors count.';
    }

    if (/gtstaffing/.test(url)) {
        await page.waitForSelector('.job-list', { timeout: 60_000 });
        await clickOnLoadMoreButtonWhilePresent(page, '.load-more-data');
        await sleep(2_000);
        jobsCount = await page.locator('.slide-up-item').count();
        method += ' Automated loading of whole list by button clicks, count based on selectors count.';
    }

    await pushToDataset(userData.startUrl, jobsCount, method);
});
