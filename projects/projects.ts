// Projects

type Category =
    | "ui-ux"
    | "branding"
    | "logo"
    | "packaging"
    | "web-design";

type ProjectHover = {
    background: string;
    accentColor: string;

    buttonBackground: string;
    buttonTextColor: string;
};

type ProjectImage = {
    src: string;
    alt?: string;
};

type Project = {
    id: number;

    image: ProjectImage[];
    createdAt: Date;
    name: string;
    categories: Category[];
    hover: ProjectHover;
};