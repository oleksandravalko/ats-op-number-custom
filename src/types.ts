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
    startUrl: string;
    jobsCount?: number;
    positionSelector: string;
    nextButtonSelector: string;
}

export type LastPageRequest = {
    url: string;
    label: string;
    userData: LastPageCrawlingData;
};

export type LastPageCrawlingData = {
    startUrl: string,
    maxJobsCountPerPage: number,
    positionSelector: '.ant-list-item',
    paginationItemSelector: '.ant-pagination-item',
}
