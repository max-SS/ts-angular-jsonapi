declare module Jsonapi {
    interface ICore {
        rootPath?: string;
        resources?: Array<Jsonapi.IResource>;

        Me?: Jsonapi.ICore;
        Services?: any;

        loadingsStart?: Function;
        loadingsDone?: Function;

        // _register?(clase: Jsonapi.IResource): void;
        _register? (clase: any): void;    // Jsonapi.IResource fail on resourse.ts
        getResource? (type: string): Jsonapi.IResource;
        refreshLoadings?(factor: number): void;
    }
}

declare module Jsonapi {
    interface IDataCollection extends IDocument {
        data: IResource[];
    }
}

declare module Jsonapi {
    interface IDataObject extends IDocument {
        data: Jsonapi.IDataResource;
        include?: Object;
    }
}

declare module Jsonapi {
    interface IDataResource {
        type: string;
        id: string;
        attributes?: any;
        relationships?: any;
        links?: Jsonapi.ILinks;
        meta?: any;
    }
}

// http://jsonapi.org/format/#document-top-level
declare module Jsonapi {
    interface IDocument {
        // data in child interface IJsonapiCollection
        // error in child interface IJsonapiErrors
        jsonapi?: string;
        links?: ILinks;
        included?: Object;
        meta?: Object;

        promise?: any;
    }
}

declare module Jsonapi {
    interface IErrors extends IDocument {
        errors: [
            {
                code?: string,
                source?: {
                    attributes?: string,
                    pointer: string
                },
                title?: string,
                detail?: string
            }
        ];
    }
}

// http://jsonapi.org/format/#document-links
declare module Jsonapi {
    interface ILinks {
        self?: string;
        related?: {
            href: string;
            meta: any;
        };
    }
}

declare module Jsonapi {
    interface IParams {
        id?: String;
        include?: Array<String>;
    }
}

declare module Jsonapi {
    interface IResource extends IDataResource {
        schema?: ISchema;

        clone? (resource: Jsonapi.IResource, type_alias?: string): Object;
        addRelationship? (resource: IResource, type_alias?: string): void;
        toObject? (params: Jsonapi.IParams): Jsonapi.IDataObject;
        register? (): void;
        // new? (): IResource;
        get? (id: String): IResource;
        all? (): Array<IResource>;
    }
}

declare module Jsonapi {
    interface ISchema {
        // type: string;
        // id: string;    // not required when the resource object represents a new resource to be created on server?
        attributes?: any;
        relationships?: any;
        path?: string;
    }
}

/// <reference path="_all.d.ts" />

declare module Jsonapi {
    class Http {
        protected $http: any;
        protected rsJsonapiConfig: any;
        protected $q: any;
        /** @ngInject */
        constructor($http: any, rsJsonapiConfig: any, $q: any);
        delete(path: string): void;
        get(path: string): any;
        protected exec(path: string, method: string, data?: Jsonapi.IDataObject): any;
    }
}

declare module Jsonapi {
    class PathMaker {
        paths: Array<String>;
        includes: Array<String>;
        addPath(value: String): void;
        setInclude(strings_array: Array<String>): void;
        get(): String;
    }
}

declare module Jsonapi {
    class ResourceMaker {
        static getService(type: string): Jsonapi.IResource;
        static make(data: Jsonapi.IDataResource): Jsonapi.IResource;
        static procreate(resource_service: Jsonapi.IResource, data: Jsonapi.IDataResource): Jsonapi.IResource;
    }
}

declare module Jsonapi {
    class Core implements Jsonapi.ICore {
        protected rsJsonapiConfig: any;
        protected JsonapiCoreServices: any;
        rootPath: string;
        resources: Array<Jsonapi.IResource>;
        loadingsCounter: number;
        loadingsStart: () => void;
        loadingsDone: () => void;
        static Me: Jsonapi.ICore;
        static Services: any;
        /** @ngInject */
        constructor(rsJsonapiConfig: any, JsonapiCoreServices: any);
        _register(clase: any): void;
        getResource(type: string): any;
        refreshLoadings(factor: number): void;
    }
}

declare module Jsonapi {
    class Resource implements IResource {
        schema: ISchema;
        protected path: string;
        type: string;
        id: string;
        attributes: any;
        relationships: any;
        private params_base;
        clone(): any;
        register(): void;
        getPath(): string;
        new(): IResource;
        reset(): void;
        toObject(params: Jsonapi.IParams): Jsonapi.IDataObject;
        get(id: String, params?: any, fc_success?: any, fc_error?: any): IResource;
        all(params?: any, fc_success?: any, fc_error?: any): Array<IResource>;
        save(params?: any, fc_success?: any, fc_error?: any): Array<IResource>;
        exec(id: String, params: Jsonapi.IParams, fc_success: any, fc_error: any, exec_type: string): any;
        _save(params?: any, fc_success?: any, fc_error?: any): IResource;
        _get(id: String, params: any, fc_success: any, fc_error: any): IResource;
        _all(params: any, fc_success: any, fc_error: any): Array<IResource>;
        addRelationship(resource: Jsonapi.IResource, type_alias?: string): void;
    }
}

/// <reference path="interfaces/document.d.ts" />
/// <reference path="interfaces/data-collection.d.ts" />
/// <reference path="interfaces/data-object.d.ts" />
/// <reference path="interfaces/data-resource.d.ts" />
/// <reference path="interfaces/params.d.ts" />
/// <reference path="interfaces/errors.d.ts" />
/// <reference path="interfaces/links.d.ts" />
/// <reference path="interfaces/schema.d.ts" />
/// <reference path="interfaces/core.d.ts" />
/// <reference path="interfaces/resource.d.ts" />
/// <reference path="app.module.d.ts" />
/// <reference path="services/http.service.d.ts" />
/// <reference path="services/path-maker.d.ts" />
/// <reference path="services/resource-maker.d.ts" />
/// <reference path="core.d.ts" />
/// <reference path="resource.d.ts" />

declare module Jsonapi {
    class CoreServices {
        protected JsonapiHttp: any;
        /** @ngInject */
        constructor(JsonapiHttp: any);
    }
}

declare module Jsonapi {
    class JsonapiParser {
        /** @ngInject */
        constructor();
        toObject(json_string: string): string;
    }
}

declare module Jsonapi {
    class JsonapiStorage {
        /** @ngInject */
        constructor();
        get(key: any): void;
        merge(key: any, data: any): void;
    }
}
