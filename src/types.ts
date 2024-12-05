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
    userData: {
        domain?: string;
        startUrl: string;
        jobsCount: number;
        positionSelector: string;
        nextButtonSelector: string;
    };
};
