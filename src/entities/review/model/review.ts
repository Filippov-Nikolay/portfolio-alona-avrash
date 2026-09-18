export interface ReviewI18n {
    comment: string;
}

export interface ReviewRaw {
    id: number;
    nameProject: string;
    name: string;
    i18n: Record<string, ReviewI18n>;
}

export interface Review {
    id: number;
    nameProject: string;
    comment: string;
    name: string;
}
