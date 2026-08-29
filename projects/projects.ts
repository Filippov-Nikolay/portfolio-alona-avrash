type ProjectHover = {
    background: string;
    accentColor: string;

    buttonBackground: string;
    buttonTextColor: string;
};

type Project = {
    id: number;

    image: ProjectImage[];
    createdAt: Date;
    name: string;
    categories: Category[];
    hover: ProjectHover;
};