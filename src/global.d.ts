interface H5vpAdmin {
    ajaxUrl: string;
    nonce: string;
}

interface WPAjaxDeferred {
    done: (cb: (res: any) => void) => WPAjaxDeferred;
    fail: (cb: (error: any) => void) => WPAjaxDeferred;
    then: (cb: () => void) => void;
}

interface Window {
    h5vpAdmin: H5vpAdmin;
    importReload: string;
    id: string;
    wp: {
        ajax: {
            post: (action: string, data: Record<string, unknown>) => WPAjaxDeferred;
        };
    };
    elementorFrontend: any;
    Plyr: any;
    h5vpPlyr: any;
    h5vpI18n: any;
    instance: [Plyr?];
    dashjs: any;
    Hls: any;
    hpublic: any;
    h5vpBlock: any;
}

declare const h5vpAdmin: H5vpAdmin;
declare const jQuery: any;
declare const Chart: any;
declare const wp: Window["wp"];

