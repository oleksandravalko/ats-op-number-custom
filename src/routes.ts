import { createPlaywrightRouter, log, sleep, KeyValueStore } from 'crawlee';
import { REQUEST_LABELS } from './contstants.js';
import {
    clickOnLoadMoreButtonWhilePresent,
    getJobsCountByCrawlingThroughConsequentPages, getNumberBySelector,
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

    await Promise.race([
        page.waitForLoadState('networkidle', { timeout: 120_000 }),
        sleep(50_000),
    ]);

    if (url.includes('recruiting.ultipro')) {
        await sleep(10_000);
        jobsCount = await getNumberFromMixedString(page, '[data-automation="opportunities-count"]');
        method = 'Found on page.';
    }

    if (url.includes('careers.joveo')) {
        jobsCount = await getNumberFromMixedString(page, 'h6.mui-style-d6f2o4');
        method = 'Found on page.';
    }
    if (/alliedonesource/.test(domain)) {
        await page.waitForSelector('.shmResultCount');
        jobsCount = await getNumberFromMixedString(page, '.shmResultCount');
        method = 'Found on page.';
    }

    if (url.includes('bawc')) {
        jobsCount = 1;
        method = 'Set manually.';
    }

    if (/epitec/.test(domain)) {
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

    if (/yorkemployment/.test(domain)
        || /burnettspecialists/.test(domain)
        || /selectek/.test(domain)
        || /dwsimpson/.test(domain)
        || /hhstaffingservices/.test(domain)
        || /intersolutions/.test(domain)
        || /theseergroup/.test(domain)
        || /sterling-engineering/.test(domain)
    ) {
        await scrollToTheBottom(page);
        jobsCount = await page.locator('.job-post-row').count();
        method = 'Automated loading of whole list by scrolling, count based on selectors count.';
    }

    if (/jobs.jobvite/.test(domain)) {
        jobsCount = await page.locator('.jv-job-list-name').count();
        method = 'Based on selectors count.';
    }

    if (/edtheory/.test(domain)) {
        jobsCount = await page.locator('.job-details .row').count();
        method = 'Based on selectors count.';
    }

    if (/avanceservices/.test(domain)) {
        jobsCount = await page.locator('.elementor-accordion-item').count();
        method = 'Based on selectors count.';
    }

    if (/myworkchoice/.test(domain)) {
        jobsCount = await page.locator('.type-job_listing').count();
        method = 'Based on selectors count.';
    }

    if (/jcsi/.test(domain)) {
        jobsCount = await page.locator('.cr-job-item').count();
        method = 'Based on selectors count.';
    }

    if (/cfstaffing/.test(domain)) {
        await page.waitForSelector('#resultsareaID');
        await scrollToTheBottom(page);
        jobsCount = await page.locator('.job-row').count();
        method = 'Automated loading of whole list by scrolling, count based on selectors count.';
    }

    if (/atrinternational/.test(domain)) {
        await scrollToTheBottom(page);
        jobsCount = await page.locator('.MuiButtonBase-root').count();
        method = 'Automated loading of whole list by scrolling, count based on selectors count.';
    }

    if (/oklahomadepartmentofhumanservices/.test(domain)) {
        jobsCount = await page.locator('.list-group-item').count();
        method = 'Based on selectors count.';
    }

    if (/msisurfaces/.test(domain)) {
        jobsCount = await page.locator('.searchPartialContent .col-xs-12').count();
        method = 'Based on selectors count.';
    }

    if (/allegiancestaffing/.test(domain)) {
        jobsCount = await page.locator('a[x-text="job.title"]').count();
        method = 'Based on selectors count.';
    }

    if (/leisurecare/.test(domain)) {
        await page.waitForSelector('.jobaline-job');
        jobsCount = await page.locator('.jobaline-job').count();
        method = 'Based on selectors count.';
    }

    if (/myjobs.adp/.test(domain)) {
        await crawler.addRequests([
            {
                url: 'https://myjobs.adp.com/cenveo/cx/job-listing',
                label: REQUEST_LABELS.ALTERNATIVE,
                userData: {
                    startUrl: url,
                },
            },
        ]);
        return;
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

    if (/stutsmans/.test(domain)) {
        const frameLocator = page.frameLocator('#gnewtonIframe');
        if (await frameLocator.locator('#gnewtonCareerHome').isVisible({ timeout: 120_000 })) {
            jobsCount = await frameLocator.locator('.gnewtonJobLink')?.count();
            method = 'Based on selectors count.';
        }
    }

    if (/jacobyandmeyers/.test(domain)) {
        const frameLocator = page.frameLocator('#jv_careersite_iframe_id');
        if (await frameLocator.locator('.jv-page-content').isVisible({ timeout: 120_000 })) {
            jobsCount = await frameLocator.locator('.jv-job-list-name')?.count();
            method = 'Based on selectors count.';
        }
    }

    if (/oppenheimer/.test(domain)) {
        const frameLocator = page.frameLocator('#inlineframe');
        jobsCount = await frameLocator.locator('.jobListItem').count();
        method = 'Based on selectors count.';
    }

    if (/talkspace/.test(domain)) {
        const frameLocator = page.frameLocator('#grnhse_iframe');
        jobsCount = await frameLocator.locator('.opening').count();
        method = 'Based on selectors count.';
    }

    if (/supplyhouse/.test(domain)) {
        jobsCount = await page.locator('.pos-item').count();
        method = 'Based on selectors count.';
    }

    if (/ssemploymentpartners/.test(domain)) {
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

    if (/gtstaffing/.test(domain)) {
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

    if (url.includes('m-v-t')) {
        await page.waitForSelector('.job_listing', { timeout: 60_000 });
        await clickOnLoadMoreButtonWhilePresent(page, '.load_more_jobs');
        await sleep(2_000);
        jobsCount = await page.locator('.job_listing').count();
        method = 'Automated loading of whole list by button clicks, count based on selectors count.';
    }

    if (/velosource/.test(domain)) {
        await page.waitForSelector('[role="listitem"]', { timeout: 120_000 });
        await clickOnLoadMoreButtonWhilePresent(page, '[aria-label="Load More"]');
        await sleep(2_000);
        jobsCount = await page.locator('[role="listitem"]').count();
        method = 'Automated loading of whole list by button clicks, count based on selectors count.';
    }

    if (/hawxpestcontrol/.test(domain)) {
        jobsCount = await page.locator('.careers-job-list-data').count();
        method = 'Based on selectors count.';
    }

    if (/careeradvancers/.test(domain)) {
        await page.waitForSelector('.recruiterwp-jobs-col', { timeout: 60_000 });
        await clickOnLoadMoreButtonWhilePresent(page, '.facetwp-load-more');
        await sleep(2_000);
        jobsCount = await page.locator('.job-listing-item').count();
        method = 'Automated loading of whole list by button clicks, count based on selectors count.';
    }

    if (/monarchlandscape/.test(domain)) {
        const frameLocator = page.frameLocator('#inlineframe');
        jobsCount = await frameLocator.locator('tr.ReqRowClick').count();
        method = 'Based on selectors count.';
    }

    if (/tarzanatc/.test(domain)) {
        jobsCount = await page.locator('tr.ReqRowClick').count();
        method = 'Based on selectors count.';
    }

    if (/mgahomecare/.test(domain)) {
        jobsCount = await page.locator('tr.joblist').count();
        method = 'Based on selectors count.';
    }

    if (/managedlaborsolutions.prismhr-hire/.test(domain)) {
        jobsCount = await page.locator('.job-container').count();
        method = 'Based on selectors count.';
    }

    if (/dealerflex/.test(domain)) {
        jobsCount = await page.locator('.single-job').count();
        method = 'Based on selectors count.';
    }

    if (/backyardproducts/.test(domain)) {
        const frameLocator = page.frameLocator('#gnewtonIframe');
        jobsCount = await frameLocator.locator('.gnewtonCareerGroupRowClass').count();
        method = 'Based on selectors count.';
    }

    if (/jobs.dayforcehcm/.test(domain)) {
        const positionSelector = '.ant-list-item';
        const lastPageButtonSelector = '.ant-pagination-item';
        const pageKey = 'page';

        const maxJobsCountPerPage = await page.locator(positionSelector).count();
        await page.waitForSelector('.ant-pagination', { timeout: 120_000 });
        const lastPageNumber = Number(await page.locator(lastPageButtonSelector).last().innerText());

        if (lastPageNumber && lastPageNumber > 1) {
            const lastPageUrl = `${url}?${pageKey}=${lastPageNumber}`;

            await crawler.addRequests([
                {
                    url: lastPageUrl,
                    label: REQUEST_LABELS.LAST,
                    userData: {
                        maxJobsCountPerPage,
                        pageKey,
                        lastPageButtonSelector,
                        positionSelector,
                        startUrl: url,
                    } as LastPageCrawlingData,
                } as LastPageRequest,
            ]);
            return;
        }
        jobsCount = maxJobsCountPerPage;
        method = 'Based on selectors count.';
    }

    if (/us\d\d\d\.dayforcehcm/.test(domain)) {
        const positionSelector = '.search-result';
        const lastPageButtonSelector = '.pagination li[class]';
        const pageKey = 'page';

        const maxJobsCountPerPage = await page.locator(positionSelector).count();
        const lastPageNumber = Number(await page.locator(lastPageButtonSelector).last().innerText()); // last page button

        if (lastPageNumber && lastPageNumber > 1) {
            const lastPageUrl = `${url}?${pageKey}=${lastPageNumber}`;

            await crawler.addRequests([
                {
                    url: lastPageUrl,
                    label: REQUEST_LABELS.LAST,
                    userData: {
                        maxJobsCountPerPage,
                        pageKey,
                        lastPageButtonSelector,
                        positionSelector,
                        startUrl: url,
                    } as LastPageCrawlingData,
                } as LastPageRequest,
            ]);
            return;
        }
        jobsCount = maxJobsCountPerPage;
        method = 'Based on selectors count.';
    }

    if (/icims/.test(domain)) {
        const positionSelector = '.iCIMS_JobsTable .row';
        const lastPageButtonSelector = '.iCIMS_PagingBatch a:last-child .sr-only:nth-child(2)';
        const iframeSelector = '#icims_content_iframe';
        const pageKey = 'pr';

        const frameLocator = page.frameLocator(iframeSelector);
        await KeyValueStore.setValue('scr1', await page.screenshot(), { contentType: 'image/png' });
        const maxJobsCountPerPage = await frameLocator.locator(positionSelector).count();
        const lastPageNumber = await getNumberBySelector(frameLocator, lastPageButtonSelector); // tricky, last page number is in hidden text on button

        if (lastPageNumber && lastPageNumber > 1) {
            const lastPageUrl = `${url}&${pageKey}=${lastPageNumber - 1}`;// -1 is specific for this case

            await crawler.addRequests([
                {
                    url: lastPageUrl,
                    label: REQUEST_LABELS.LAST,
                    userData: {
                        // currentPageButtonSelector,
                        iframeSelector,
                        maxJobsCountPerPage,
                        pageKey,
                        lastPageButtonSelector,
                        positionSelector,
                        startUrl: url,
                    } as LastPageCrawlingData,
                } as LastPageRequest,
            ]);
            return;
        }
        jobsCount = maxJobsCountPerPage;
        method = 'Based on selectors count.';
    }

    // if (/myavionte/.test(domain)) {
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
    const { userData } = request;
    const {
        maxJobsCountPerPage,
        lastPageButtonSelector,
        startUrl, positionSelector,
        iframeSelector,
    } = userData;
    const frame = iframeSelector ? page.frameLocator(iframeSelector) : page;
    const lastPageNumber = await getNumberBySelector(frame, lastPageButtonSelector);

    if (lastPageNumber) {
        const jobsCountOnCurrentPage = await frame.locator(positionSelector).count();
        const jobsCountOnPreviousPages = maxJobsCountPerPage * (lastPageNumber - 1);
        const jobsCount = jobsCountOnCurrentPage + jobsCountOnPreviousPages;
        await pushToDataset(startUrl, jobsCount, 'Jumped to the last page and calculated jobs.');
    }
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

    if (/myjobs.adp/.test(url)) {
        await page.waitForSelector('.left-panel', { timeout: 120_000 });
        const foundNumber = await page.evaluate(() => {
            return document.querySelector('.results-count-label-web span:first-child')?.innerHTML.replace(/\D/g, '');
        });
        jobsCount = Number(foundNumber);
        method = 'Found on page.';
    }

    await pushToDataset(userData.startUrl, jobsCount, method);
});
