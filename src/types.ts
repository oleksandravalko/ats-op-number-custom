export interface Input {
    startUrls: StartUrl[];
    maxRequestsPerCrawl: number;
}

export type StartUrl = {
    url: string,
}

export type Request = {
    url: string;
    label: string;
};

export type NextPageRequest = {
    url: string;
    label: string;
    userData: NextPageCrawlingData;
};

export type NextPageCrawlingData = {
    domain?: string;
    jobsCount?: number;
    nextButtonSelector: string;
    positionSelector: string;
    startUrl: string;
}

export type LastPageRequest = {
    url: string;
    label: string;
    userData: LastPageCrawlingData;
};

export type LastPageCrawlingData = {
    iframeSelector?: string,
    maxJobsCountPerPage: number,
    pageKey: string,
    lastPageButtonSelector: string,
    positionSelector: string
    startUrl: string,
}
