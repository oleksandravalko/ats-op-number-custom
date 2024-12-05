import { Page } from 'playwright';
import { Dataset, PlaywrightCrawler, sleep } from 'crawlee';
import { REQUEST_LABELS } from './contstants.js';
import { NextPageCrawlingData, NextPageRequest } from './types.js';

export const getNumberFromMixedString = async (page: Page, selector: string): Promise<number> => {
    const onlyNumericalValue = await page.evaluate((selector) => document.querySelector(selector)?.innerHTML.replace(/[^0-9.]/g, ''), selector);
    return Number(onlyNumericalValue) || 0;
};

export const getNumberBySelectorCount = async (page:Page, selector: string): Promise<number> => {
    return await page.evaluate((selector) => document.querySelectorAll(selector)?.length, selector);
};

export const scrollToTheBottom = async (page:Page) => {
    const currentHeight = await page.evaluate(() => {
        const startingHeight = document.body.scrollHeight;
        window.scrollTo(0, startingHeight);
        return startingHeight;
    });
    await sleep(3_000);
    const newHeight = await page.evaluate(() => document.body.scrollHeight);
    if (newHeight > currentHeight) {
        await scrollToTheBottom(page);
    }
};

export const clickOnLoadMoreButtonWhilePresent = async (page:Page, buttonSelector:string) => {
    const locator = page.locator(buttonSelector);
    if (locator) {
        try {
            await locator.click();
            await sleep(2_000);
            await clickOnLoadMoreButtonWhilePresent(page, buttonSelector);
        } catch {
            //
        }
    }
};

export const getNextPageUrlFromSelector = async (page:Page, selector:string) => {
    return await page.evaluate((selector) => document.querySelector(selector)?.getAttribute('href'), selector);
};

export const pushToDataset = async (url: string, number:number, method:string) => {
    await Dataset.pushData({
        url,
        number,
        method,
    });
};

export const getJobsCountByCrawlingThroughConsequentPages = async (page:Page, crawlingData:NextPageCrawlingData, crawler:PlaywrightCrawler) => {
    const {
        domain,
        startUrl,
        jobsCount,
        positionSelector,
        nextButtonSelector,
    } = crawlingData;

    const jobsCountOnCurrentPage = await getNumberBySelectorCount(page, positionSelector);
    const newJobsCount = jobsCount ? jobsCount + jobsCountOnCurrentPage : jobsCountOnCurrentPage;

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
    return newJobsCount;
};
