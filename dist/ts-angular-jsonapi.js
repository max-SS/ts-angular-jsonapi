/// <reference path="./_all.ts" />
(function (angular) {
    // Config
    angular.module('Jsonapi.config', [])
        .constant('rsJsonapiConfig', {
        url: 'http://yourdomain/api/v1/'
    });
    angular.module('Jsonapi.services', []);
    angular.module('rsJsonapi', [
        'angular-storage',
        'Jsonapi.config',
        'Jsonapi.services'
    ]);
})(angular);

var Jsonapi;
(function (Jsonapi) {
    var Http = (function () {
        /** @ngInject */
        Http.$inject = ["$http", "rsJsonapiConfig", "$q"];
        function Http($http, rsJsonapiConfig, $q) {
            this.$http = $http;
            this.rsJsonapiConfig = rsJsonapiConfig;
            this.$q = $q;
        }
        Http.prototype.delete = function (path) {
        };
        Http.prototype.get = function (path) {
            return this.exec(path, 'GET');
        };
        Http.prototype.exec = function (path, method, data) {
            var req = {
                method: method,
                url: this.rsJsonapiConfig.url + path,
                headers: {
                    'Content-Type': 'application/vnd.api+json'
                }
            };
            data && (req['data'] = data);
            var promise = this.$http(req);
            var deferred = this.$q.defer();
            var xthis = this;
            Jsonapi.Core.Me.refreshLoadings(1);
            promise.then(function (success) {
                Jsonapi.Core.Me.refreshLoadings(-1);
                deferred.resolve(success);
            }, function (error) {
                Jsonapi.Core.Me.refreshLoadings(-1);
                deferred.reject(error);
            });
            return deferred.promise;
        };
        return Http;
    }());
    Jsonapi.Http = Http;
    angular.module('Jsonapi.services').service('JsonapiHttp', Http);
})(Jsonapi || (Jsonapi = {}));

var Jsonapi;
(function (Jsonapi) {
    var PathMaker = (function () {
        function PathMaker() {
            this.paths = [];
            this.includes = [];
        }
        PathMaker.prototype.addPath = function (value) {
            this.paths.push(value);
        };
        PathMaker.prototype.setInclude = function (strings_array) {
            this.includes = strings_array;
        };
        PathMaker.prototype.get = function () {
            var get_params = [];
            if (this.includes.length > 0) {
                get_params.push('include=' + this.includes.join(','));
            }
            return this.paths.join('/') +
                (get_params.length > 0 ? '/?' + get_params.join('&') : '');
        };
        return PathMaker;
    }());
    Jsonapi.PathMaker = PathMaker;
})(Jsonapi || (Jsonapi = {}));

var Jsonapi;
(function (Jsonapi) {
    var Converter = (function () {
        function Converter() {
        }
        /**
        Convert json arrays (like included) to an Resources arrays without [keys]
        **/
        Converter.json_array2resources_array = function (json_array, destination_array, use_id_for_key) {
            if (use_id_for_key === void 0) { use_id_for_key = false; }
            if (!destination_array) {
                destination_array = [];
            }
            for (var _i = 0, json_array_1 = json_array; _i < json_array_1.length; _i++) {
                var data = json_array_1[_i];
                var resource = Jsonapi.Converter.json2resource(data, false);
                if (use_id_for_key) {
                    destination_array[resource.id] = resource;
                }
                else {
                    destination_array.push(resource);
                }
            }
            return destination_array;
        };
        /**
        Convert json arrays (like included) to an indexed Resources array by [type][id]
        **/
        Converter.json_array2resources_array_by_type = function (json_array, instance_relationships) {
            var all_resources = [];
            Converter.json_array2resources_array(json_array, all_resources, false);
            var resources = [];
            angular.forEach(all_resources, function (resource) {
                if (!(resource.type in resources)) {
                    resources[resource.type] = [];
                }
                resources[resource.type][resource.id] = resource;
            });
            return resources;
        };
        Converter.json2resource = function (json_resource, instance_relationships) {
            var resource_service = Jsonapi.Converter.getService(json_resource.type);
            if (resource_service) {
                return Jsonapi.Converter.procreate(resource_service, json_resource);
            }
        };
        Converter.getService = function (type) {
            var resource_service = Jsonapi.Core.Me.getResource(type);
            if (angular.isUndefined(resource_service)) {
                console.warn('Jsonapi Resource type `' + type + '` is not definded.');
            }
            return resource_service;
        };
        Converter.procreate = function (resource_service, data) {
            if (!('type' in data && 'id' in data)) {
                console.error('Jsonapi Resource is not correct', data);
            }
            var resource = new resource_service.constructor();
            resource.new();
            resource.id = data.id;
            resource.attributes = data.attributes;
            return resource;
        };
        return Converter;
    }());
    Jsonapi.Converter = Converter;
})(Jsonapi || (Jsonapi = {}));

var Jsonapi;
(function (Jsonapi) {
    var Core = (function () {
        /** @ngInject */
        Core.$inject = ["rsJsonapiConfig", "JsonapiCoreServices"];
        function Core(rsJsonapiConfig, JsonapiCoreServices) {
            this.rsJsonapiConfig = rsJsonapiConfig;
            this.JsonapiCoreServices = JsonapiCoreServices;
            this.rootPath = 'http://reyesoft.ddns.net:9999/api/v1/companies/2';
            this.resources = [];
            this.loadingsCounter = 0;
            this.loadingsStart = function () { };
            this.loadingsDone = function () { };
            Jsonapi.Core.Me = this;
            Jsonapi.Core.Services = JsonapiCoreServices;
        }
        Core.prototype._register = function (clase) {
            if (clase.type in this.resources) {
                return false;
            }
            this.resources[clase.type] = clase;
            return true;
        };
        Core.prototype.getResource = function (type) {
            return this.resources[type];
        };
        Core.prototype.refreshLoadings = function (factor) {
            this.loadingsCounter += factor;
            if (this.loadingsCounter === 0) {
                this.loadingsDone();
            }
            else if (this.loadingsCounter === 1) {
                this.loadingsStart();
            }
        };
        Core.Me = null;
        Core.Services = null;
        return Core;
    }());
    Jsonapi.Core = Core;
    angular.module('Jsonapi.services').service('JsonapiCore', Core);
})(Jsonapi || (Jsonapi = {}));

var Jsonapi;
(function (Jsonapi) {
    var Resource = (function () {
        function Resource() {
            this.path = null; // without slashes
            this.relationships = [];
            this.params_base = {
                id: '',
                include: []
            };
        }
        Resource.prototype.clone = function () {
            var cloneObj = new this.constructor();
            for (var attribut in this) {
                if (typeof this[attribut] !== 'object') {
                    cloneObj[attribut] = this[attribut];
                }
            }
            return cloneObj;
        };
        /**
        Register schema on Jsonapi.Core
        @return true if the resource don't exist and registered ok
        **/
        Resource.prototype.register = function () {
            return Jsonapi.Core.Me._register(this);
        };
        Resource.prototype.getPath = function () {
            return this.path ? this.path : this.type;
        };
        // empty self object
        Resource.prototype.new = function () {
            var resource = this.clone();
            resource.reset();
            return resource;
        };
        Resource.prototype.reset = function () {
            var xthis = this;
            this.id = '';
            this.attributes = {};
            this.relationships = {};
            angular.forEach(this.schema.relationships, function (value, key) {
                xthis.relationships[key] = {};
                xthis.relationships[key]['data'] = {};
            });
        };
        Resource.prototype.toObject = function (params) {
            var relationships = {};
            angular.forEach(this.relationships, function (relationship, relation_alias) {
                relationships[relation_alias] = { data: [] };
                angular.forEach(relationship.data, function (resource) {
                    var reational_object = { id: resource.id, tpe: resource.type };
                    relationships[relation_alias]['data'].push(reational_object);
                });
            });
            return {
                data: {
                    type: this.type,
                    id: this.id,
                    attributes: this.attributes,
                    relationships: relationships
                },
                include: {}
            };
            //return object;
        };
        Resource.prototype.get = function (id, params, fc_success, fc_error) {
            return this.__exec(id, params, fc_success, fc_error, 'get');
        };
        Resource.prototype.all = function (params, fc_success, fc_error) {
            return this.__exec(null, params, fc_success, fc_error, 'all');
        };
        Resource.prototype.save = function (params, fc_success, fc_error) {
            return this.__exec(null, params, fc_success, fc_error, 'save');
        };
        /**
        This method sort params for new(), get() and update()
        */
        Resource.prototype.__exec = function (id, params, fc_success, fc_error, exec_type) {
            // makes `params` optional
            if (angular.isFunction(params)) {
                fc_error = fc_success;
                fc_success = params;
                params = this.params_base;
            }
            else {
                if (angular.isUndefined(params)) {
                    params = this.params_base;
                }
                else {
                    params = angular.extend({}, this.params_base, params);
                }
            }
            fc_success = angular.isFunction(fc_success) ? fc_success : function () { };
            fc_error = angular.isFunction(fc_error) ? fc_error : function () { };
            switch (exec_type) {
                case 'get':
                    return this._get(id, params, fc_success, fc_error);
                case 'all':
                    return this._all(params, fc_success, fc_error);
                case 'save':
                    return this._save(params, fc_success, fc_error);
            }
        };
        Resource.prototype._get = function (id, params, fc_success, fc_error) {
            // http request
            var path = new Jsonapi.PathMaker();
            path.addPath(this.getPath());
            path.addPath(id);
            params.include ? path.setInclude(params.include) : null;
            //let resource = new Resource();
            var resource = this.new();
            var promise = Jsonapi.Core.Services.JsonapiHttp.get(path.get());
            promise.then(function (success) {
                var value = success.data.data;
                resource.attributes = value.attributes;
                resource.id = value.id;
                // instancio los include y los guardo en included arrary
                var included = Jsonapi.Converter.json_array2resources_array_by_type(success.data.included, false);
                // recorro los relationships levanto el service correspondiente
                angular.forEach(value.relationships, function (relation_value, relation_key) {
                    // relation is in schema? have data or just links?
                    if (!(relation_key in resource.relationships) && ('data' in relation_value)) {
                        console.warn(resource.type + '.relationships.' + relation_key + ' received, but is not defined on schema.');
                        resource.relationships[relation_key] = { data: [] };
                    }
                    var resource_service = Jsonapi.Converter.getService(relation_key);
                    if (resource_service) {
                        // recorro los resources del relation type
                        var relationship_resources = [];
                        angular.forEach(relation_value.data, function (resource_value) {
                            // está en el included?
                            var tmp_resource;
                            if (resource_value.type in included && resource_value.id in included[resource_value.type]) {
                                tmp_resource = included[resource_value.type][resource_value.id];
                            }
                            else {
                                tmp_resource = Jsonapi.Converter.procreate(resource_service, resource_value);
                            }
                            resource.relationships[relation_key].data[tmp_resource.id] = tmp_resource;
                        });
                    }
                });
                fc_success(success);
            }, function (error) {
                fc_error(error);
            });
            return resource;
        };
        Resource.prototype._all = function (params, fc_success, fc_error) {
            // http request
            var path = new Jsonapi.PathMaker();
            path.addPath(this.getPath());
            params.include ? path.setInclude(params.include) : null;
            // make request
            var response = [];
            var promise = Jsonapi.Core.Services.JsonapiHttp.get(path.get());
            promise.then(function (success) {
                Jsonapi.Converter.json_array2resources_array(success.data.data, response, true);
                fc_success(success);
            }, function (error) {
                fc_error(error);
            });
            return response;
        };
        Resource.prototype._save = function (params, fc_success, fc_error) {
            var object = this.toObject(params);
            // http request
            var path = new Jsonapi.PathMaker();
            path.addPath(this.getPath());
            this.id && path.addPath(this.id);
            params.include ? path.setInclude(params.include) : null;
            var resource = this.new();
            var promise = Jsonapi.Core.Services.JsonapiHttp.exec(path.get(), this.id ? 'PATCH' : 'POST', object);
            promise.then(function (success) {
                var value = success.data.data;
                resource.attributes = value.attributes;
                resource.id = value.id;
                // instancio los include y los guardo en included arrary
                // let included = Converter.json_array2resources_array_by_type(success.data.included, false);
                fc_error(success);
            }, function (error) {
                fc_error(error);
            });
            return resource;
        };
        Resource.prototype.addRelationship = function (resource, type_alias) {
            type_alias = (type_alias ? type_alias : resource.type);
            if (!(type_alias in this.relationships)) {
                this.relationships[type_alias] = { data: {} };
            }
            if (!resource.id) {
                resource.id = 'new_' + (Math.floor(Math.random() * 100000));
            }
            this.relationships[type_alias]['data'][resource.id] = resource;
        };
        return Resource;
    }());
    Jsonapi.Resource = Resource;
})(Jsonapi || (Jsonapi = {}));

/// <reference path="../../typings/main.d.ts" />
// Jsonapi interfaces part of top level
/// <reference path="./interfaces/document.d.ts"/>
/// <reference path="./interfaces/data-collection.d.ts"/>
/// <reference path="./interfaces/data-object.d.ts"/>
/// <reference path="./interfaces/data-resource.d.ts"/>
/// <reference path="./interfaces/params.d.ts"/>
/// <reference path="./interfaces/errors.d.ts"/>
/// <reference path="./interfaces/links.d.ts"/>
// Parameters for TS-Jsonapi Classes
/// <reference path="./interfaces/schema.d.ts"/>
// TS-Jsonapi Classes Interfaces
/// <reference path="./interfaces/core.d.ts"/>
/// <reference path="./interfaces/resource.d.ts"/>
// TS-Jsonapi classes
/// <reference path="./app.module.ts"/>
/// <reference path="./services/http.service.ts"/>
/// <reference path="./services/path-maker.ts"/>
/// <reference path="./services/resource-converter.ts"/>
//// <reference path="./services/core-services.service.ts"/>
/// <reference path="./core.ts"/>
/// <reference path="./resource.ts"/>

var Jsonapi;
(function (Jsonapi) {
    var CoreServices = (function () {
        /** @ngInject */
        CoreServices.$inject = ["JsonapiHttp"];
        function CoreServices(JsonapiHttp) {
            this.JsonapiHttp = JsonapiHttp;
        }
        return CoreServices;
    }());
    Jsonapi.CoreServices = CoreServices;
    angular.module('Jsonapi.services').service('JsonapiCoreServices', CoreServices);
})(Jsonapi || (Jsonapi = {}));

var Jsonapi;
(function (Jsonapi) {
    var JsonapiParser = (function () {
        /** @ngInject */
        function JsonapiParser() {
        }
        JsonapiParser.prototype.toObject = function (json_string) {
            return json_string;
        };
        return JsonapiParser;
    }());
    Jsonapi.JsonapiParser = JsonapiParser;
})(Jsonapi || (Jsonapi = {}));

var Jsonapi;
(function (Jsonapi) {
    var JsonapiStorage = (function () {
        /** @ngInject */
        function JsonapiStorage() {
        }
        JsonapiStorage.prototype.get = function (key) {
            /* let data = this.store.get(key);
            return angular.fromJson(data);*/
        };
        JsonapiStorage.prototype.merge = function (key, data) {
            /* let actual_data = this.get(key);
            let actual_info = angular.fromJson(actual_data); */
        };
        return JsonapiStorage;
    }());
    Jsonapi.JsonapiStorage = JsonapiStorage;
})(Jsonapi || (Jsonapi = {}));

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5tb2R1bGUudHMiLCJhcHAubW9kdWxlLmpzIiwic2VydmljZXMvaHR0cC5zZXJ2aWNlLnRzIiwic2VydmljZXMvaHR0cC5zZXJ2aWNlLmpzIiwic2VydmljZXMvcGF0aC1tYWtlci50cyIsInNlcnZpY2VzL3BhdGgtbWFrZXIuanMiLCJzZXJ2aWNlcy9yZXNvdXJjZS1jb252ZXJ0ZXIudHMiLCJzZXJ2aWNlcy9yZXNvdXJjZS1jb252ZXJ0ZXIuanMiLCJjb3JlLnRzIiwiY29yZS5qcyIsInJlc291cmNlLnRzIiwicmVzb3VyY2UuanMiLCJfYWxsLnRzIiwiX2FsbC5qcyIsInNlcnZpY2VzL2NvcmUtc2VydmljZXMuc2VydmljZS50cyIsInNlcnZpY2VzL2NvcmUtc2VydmljZXMuc2VydmljZS5qcyIsInNlcnZpY2VzL2pzb25hcGktcGFyc2VyLnNlcnZpY2UudHMiLCJzZXJ2aWNlcy9qc29uYXBpLXBhcnNlci5zZXJ2aWNlLmpzIiwic2VydmljZXMvanNvbmFwaS1zdG9yYWdlLnNlcnZpY2UudHMiLCJzZXJ2aWNlcy9qc29uYXBpLXN0b3JhZ2Uuc2VydmljZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUVBLENBQUMsVUFBVSxTQUFPOztJQUVkLFFBQVEsT0FBTyxrQkFBa0I7U0FDaEMsU0FBUyxtQkFBbUI7UUFDekIsS0FBSzs7SUFHVCxRQUFRLE9BQU8sb0JBQW9CO0lBRW5DLFFBQVEsT0FBTyxhQUNmO1FBQ0k7UUFDQTtRQUNBOztHQUdMO0FDSkg7QUNkQSxJQUFPO0FBQVAsQ0FBQSxVQUFPLFNBQVE7SUFDWCxJQUFBLFFBQUEsWUFBQTs7O1FBR0ksU0FBQSxLQUNjLE9BQ0EsaUJBQ0EsSUFBRTtZQUZGLEtBQUEsUUFBQTtZQUNBLEtBQUEsa0JBQUE7WUFDQSxLQUFBLEtBQUE7O1FBS1AsS0FBQSxVQUFBLFNBQVAsVUFBYyxNQUFZOztRQUluQixLQUFBLFVBQUEsTUFBUCxVQUFXLE1BQVk7WUFDbkIsT0FBTyxLQUFLLEtBQUss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OztBQ3NCQTtBQ3RCQSxJQUFPO0FBQVAsQ0FBQSxVQUFPLFNBQVE7SUFDWCxJQUFBLGdCQUFBLFlBQUE7OztRQUdJLFNBQUEsYUFDYyxhQUFXO1lBQVgsS0FBQSxjQUFBOztRQUlsQixPQUFBOztJQVJhLFFBQUEsZUFBWTtJQVV6QixRQUFRLE9BQU8sb0JBQW9CLFFBQVEsdUJBQXVCO0dBWC9ELFlBQUEsVUFBTztBQ1lkO0FDWkEsSUFBTztBQUFQLENBQUEsVUFBTyxTQUFRO0lBQ1gsSUFBQSxpQkFBQSxZQUFBOztRQUdJLFNBQUEsZ0JBQUE7O1FBSU8sY0FBQSxVQUFBLFdBQVAsVUFBZ0IsYUFBbUI7WUFDL0IsT0FBTzs7UUFFZixPQUFBOztJQVZhLFFBQUEsZ0JBQWE7R0FEdkIsWUFBQSxVQUFPO0FDYWQ7QUNiQSxJQUFPO0FBQVAsQ0FBQSxVQUFPLFNBQVE7SUFDWCxJQUFBLGtCQUFBLFlBQUE7O1FBR0ksU0FBQSxpQkFBQTs7UUFPTyxlQUFBLFVBQUEsTUFBUCxVQUFXLEtBQUc7Ozs7UUFLUCxlQUFBLFVBQUEsUUFBUCxVQUFhLEtBQUssTUFBSTs7OztRQU0xQixPQUFBOztJQXJCYSxRQUFBLGlCQUFjO0dBRHhCLFlBQUEsVUFBTztBQ2tCZCIsImZpbGUiOiJ0cy1hbmd1bGFyLWpzb25hcGkuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9fYWxsLnRzXCIgLz5cblxuKGZ1bmN0aW9uIChhbmd1bGFyKSB7XG4gICAgLy8gQ29uZmlnXG4gICAgYW5ndWxhci5tb2R1bGUoJ0pzb25hcGkuY29uZmlnJywgW10pXG4gICAgLmNvbnN0YW50KCdyc0pzb25hcGlDb25maWcnLCB7XG4gICAgICAgIHVybDogJ2h0dHA6Ly95b3VyZG9tYWluL2FwaS92MS8nXG4gICAgfSk7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnSnNvbmFwaS5zZXJ2aWNlcycsIFtdKTtcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdyc0pzb25hcGknLFxuICAgIFtcbiAgICAgICAgJ2FuZ3VsYXItc3RvcmFnZScsXG4gICAgICAgICdKc29uYXBpLmNvbmZpZycsXG4gICAgICAgICdKc29uYXBpLnNlcnZpY2VzJ1xuICAgIF0pO1xuXG59KShhbmd1bGFyKTtcbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL19hbGwudHNcIiAvPlxuKGZ1bmN0aW9uIChhbmd1bGFyKSB7XG4gICAgLy8gQ29uZmlnXG4gICAgYW5ndWxhci5tb2R1bGUoJ0pzb25hcGkuY29uZmlnJywgW10pXG4gICAgICAgIC5jb25zdGFudCgncnNKc29uYXBpQ29uZmlnJywge1xuICAgICAgICB1cmw6ICdodHRwOi8veW91cmRvbWFpbi9hcGkvdjEvJ1xuICAgIH0pO1xuICAgIGFuZ3VsYXIubW9kdWxlKCdKc29uYXBpLnNlcnZpY2VzJywgW10pO1xuICAgIGFuZ3VsYXIubW9kdWxlKCdyc0pzb25hcGknLCBbXG4gICAgICAgICdhbmd1bGFyLXN0b3JhZ2UnLFxuICAgICAgICAnSnNvbmFwaS5jb25maWcnLFxuICAgICAgICAnSnNvbmFwaS5zZXJ2aWNlcydcbiAgICBdKTtcbn0pKGFuZ3VsYXIpO1xuIiwibW9kdWxlIEpzb25hcGkge1xuICAgIGV4cG9ydCBjbGFzcyBIdHRwIHtcblxuICAgICAgICAvKiogQG5nSW5qZWN0ICovXG4gICAgICAgIHB1YmxpYyBjb25zdHJ1Y3RvcihcbiAgICAgICAgICAgIHByb3RlY3RlZCAkaHR0cCxcbiAgICAgICAgICAgIHByb3RlY3RlZCByc0pzb25hcGlDb25maWcsXG4gICAgICAgICAgICBwcm90ZWN0ZWQgJHFcbiAgICAgICAgKSB7XG5cbiAgICAgICAgfVxuXG4gICAgICAgIHB1YmxpYyBkZWxldGUocGF0aDogc3RyaW5nKSB7XG5cbiAgICAgICAgfVxuXG4gICAgICAgIHB1YmxpYyBnZXQocGF0aDogc3RyaW5nKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5leGVjKHBhdGgsICdHRVQnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHByb3RlY3RlZCBleGVjKHBhdGg6IHN0cmluZywgbWV0aG9kOiBzdHJpbmcsIGRhdGE/OiBKc29uYXBpLklEYXRhT2JqZWN0KSB7XG4gICAgICAgICAgICBsZXQgcmVxID0ge1xuICAgICAgICAgICAgICAgIG1ldGhvZDogbWV0aG9kLFxuICAgICAgICAgICAgICAgIHVybDogdGhpcy5yc0pzb25hcGlDb25maWcudXJsICsgcGF0aCxcbiAgICAgICAgICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vdm5kLmFwaStqc29uJ1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBkYXRhICYmIChyZXFbJ2RhdGEnXSA9IGRhdGEpO1xuICAgICAgICAgICAgbGV0IHByb21pc2UgPSB0aGlzLiRodHRwKHJlcSk7XG5cbiAgICAgICAgICAgIGxldCBkZWZlcnJlZCA9IHRoaXMuJHEuZGVmZXIoKTtcbiAgICAgICAgICAgIGxldCB4dGhpcyA9IHRoaXM7XG4gICAgICAgICAgICBKc29uYXBpLkNvcmUuTWUucmVmcmVzaExvYWRpbmdzKDEpO1xuICAgICAgICAgICAgcHJvbWlzZS50aGVuKFxuICAgICAgICAgICAgICAgIHN1Y2Nlc3MgPT4ge1xuICAgICAgICAgICAgICAgICAgICBKc29uYXBpLkNvcmUuTWUucmVmcmVzaExvYWRpbmdzKC0xKTtcbiAgICAgICAgICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShzdWNjZXNzKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGVycm9yID0+IHtcbiAgICAgICAgICAgICAgICAgICAgSnNvbmFwaS5Db3JlLk1lLnJlZnJlc2hMb2FkaW5ncygtMSk7XG4gICAgICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlamVjdChlcnJvcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuICAgICAgICB9XG4gICAgfVxuICAgIGFuZ3VsYXIubW9kdWxlKCdKc29uYXBpLnNlcnZpY2VzJykuc2VydmljZSgnSnNvbmFwaUh0dHAnLCBIdHRwKTtcbn1cbiIsInZhciBKc29uYXBpO1xuKGZ1bmN0aW9uIChKc29uYXBpKSB7XG4gICAgdmFyIEh0dHAgPSAoZnVuY3Rpb24gKCkge1xuICAgICAgICAvKiogQG5nSW5qZWN0ICovXG4gICAgICAgIGZ1bmN0aW9uIEh0dHAoJGh0dHAsIHJzSnNvbmFwaUNvbmZpZywgJHEpIHtcbiAgICAgICAgICAgIHRoaXMuJGh0dHAgPSAkaHR0cDtcbiAgICAgICAgICAgIHRoaXMucnNKc29uYXBpQ29uZmlnID0gcnNKc29uYXBpQ29uZmlnO1xuICAgICAgICAgICAgdGhpcy4kcSA9ICRxO1xuICAgICAgICB9XG4gICAgICAgIEh0dHAucHJvdG90eXBlLmRlbGV0ZSA9IGZ1bmN0aW9uIChwYXRoKSB7XG4gICAgICAgIH07XG4gICAgICAgIEh0dHAucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIChwYXRoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5leGVjKHBhdGgsICdHRVQnKTtcbiAgICAgICAgfTtcbiAgICAgICAgSHR0cC5wcm90b3R5cGUuZXhlYyA9IGZ1bmN0aW9uIChwYXRoLCBtZXRob2QsIGRhdGEpIHtcbiAgICAgICAgICAgIHZhciByZXEgPSB7XG4gICAgICAgICAgICAgICAgbWV0aG9kOiBtZXRob2QsXG4gICAgICAgICAgICAgICAgdXJsOiB0aGlzLnJzSnNvbmFwaUNvbmZpZy51cmwgKyBwYXRoLFxuICAgICAgICAgICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAgICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi92bmQuYXBpK2pzb24nXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGRhdGEgJiYgKHJlcVsnZGF0YSddID0gZGF0YSk7XG4gICAgICAgICAgICB2YXIgcHJvbWlzZSA9IHRoaXMuJGh0dHAocmVxKTtcbiAgICAgICAgICAgIHZhciBkZWZlcnJlZCA9IHRoaXMuJHEuZGVmZXIoKTtcbiAgICAgICAgICAgIHZhciB4dGhpcyA9IHRoaXM7XG4gICAgICAgICAgICBKc29uYXBpLkNvcmUuTWUucmVmcmVzaExvYWRpbmdzKDEpO1xuICAgICAgICAgICAgcHJvbWlzZS50aGVuKGZ1bmN0aW9uIChzdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgSnNvbmFwaS5Db3JlLk1lLnJlZnJlc2hMb2FkaW5ncygtMSk7XG4gICAgICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShzdWNjZXNzKTtcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICAgICAgICAgIEpzb25hcGkuQ29yZS5NZS5yZWZyZXNoTG9hZGluZ3MoLTEpO1xuICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlamVjdChlcnJvcik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gSHR0cDtcbiAgICB9KCkpO1xuICAgIEpzb25hcGkuSHR0cCA9IEh0dHA7XG4gICAgYW5ndWxhci5tb2R1bGUoJ0pzb25hcGkuc2VydmljZXMnKS5zZXJ2aWNlKCdKc29uYXBpSHR0cCcsIEh0dHApO1xufSkoSnNvbmFwaSB8fCAoSnNvbmFwaSA9IHt9KSk7XG4iLCJtb2R1bGUgSnNvbmFwaSB7XG4gICAgZXhwb3J0IGNsYXNzIFBhdGhNYWtlciB7XG4gICAgICAgIHB1YmxpYyBwYXRoczogQXJyYXk8U3RyaW5nPiA9IFtdO1xuICAgICAgICBwdWJsaWMgaW5jbHVkZXM6IEFycmF5PFN0cmluZz4gPSBbXTtcblxuICAgICAgICBwdWJsaWMgYWRkUGF0aCh2YWx1ZTogU3RyaW5nKSB7XG4gICAgICAgICAgICB0aGlzLnBhdGhzLnB1c2godmFsdWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgcHVibGljIHNldEluY2x1ZGUoc3RyaW5nc19hcnJheTogQXJyYXk8U3RyaW5nPikge1xuICAgICAgICAgICAgdGhpcy5pbmNsdWRlcyA9IHN0cmluZ3NfYXJyYXk7XG4gICAgICAgIH1cblxuICAgICAgICBwdWJsaWMgZ2V0KCk6IFN0cmluZyB7XG4gICAgICAgICAgICBsZXQgZ2V0X3BhcmFtczogQXJyYXk8U3RyaW5nPiA9IFtdO1xuXG4gICAgICAgICAgICBpZiAodGhpcy5pbmNsdWRlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgZ2V0X3BhcmFtcy5wdXNoKCdpbmNsdWRlPScgKyB0aGlzLmluY2x1ZGVzLmpvaW4oJywnKSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB0aGlzLnBhdGhzLmpvaW4oJy8nKSArXG4gICAgICAgICAgICAgICAgKGdldF9wYXJhbXMubGVuZ3RoID4gMCA/ICcvPycgKyBnZXRfcGFyYW1zLmpvaW4oJyYnKSA6ICcnKTtcbiAgICAgICAgfVxuICAgIH1cbn1cbiIsInZhciBKc29uYXBpO1xuKGZ1bmN0aW9uIChKc29uYXBpKSB7XG4gICAgdmFyIFBhdGhNYWtlciA9IChmdW5jdGlvbiAoKSB7XG4gICAgICAgIGZ1bmN0aW9uIFBhdGhNYWtlcigpIHtcbiAgICAgICAgICAgIHRoaXMucGF0aHMgPSBbXTtcbiAgICAgICAgICAgIHRoaXMuaW5jbHVkZXMgPSBbXTtcbiAgICAgICAgfVxuICAgICAgICBQYXRoTWFrZXIucHJvdG90eXBlLmFkZFBhdGggPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgIHRoaXMucGF0aHMucHVzaCh2YWx1ZSk7XG4gICAgICAgIH07XG4gICAgICAgIFBhdGhNYWtlci5wcm90b3R5cGUuc2V0SW5jbHVkZSA9IGZ1bmN0aW9uIChzdHJpbmdzX2FycmF5KSB7XG4gICAgICAgICAgICB0aGlzLmluY2x1ZGVzID0gc3RyaW5nc19hcnJheTtcbiAgICAgICAgfTtcbiAgICAgICAgUGF0aE1ha2VyLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgZ2V0X3BhcmFtcyA9IFtdO1xuICAgICAgICAgICAgaWYgKHRoaXMuaW5jbHVkZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGdldF9wYXJhbXMucHVzaCgnaW5jbHVkZT0nICsgdGhpcy5pbmNsdWRlcy5qb2luKCcsJykpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMucGF0aHMuam9pbignLycpICtcbiAgICAgICAgICAgICAgICAoZ2V0X3BhcmFtcy5sZW5ndGggPiAwID8gJy8/JyArIGdldF9wYXJhbXMuam9pbignJicpIDogJycpO1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gUGF0aE1ha2VyO1xuICAgIH0oKSk7XG4gICAgSnNvbmFwaS5QYXRoTWFrZXIgPSBQYXRoTWFrZXI7XG59KShKc29uYXBpIHx8IChKc29uYXBpID0ge30pKTtcbiIsIm1vZHVsZSBKc29uYXBpIHtcbiAgICBleHBvcnQgY2xhc3MgQ29udmVydGVyIHtcblxuICAgICAgICAvKipcbiAgICAgICAgQ29udmVydCBqc29uIGFycmF5cyAobGlrZSBpbmNsdWRlZCkgdG8gYW4gUmVzb3VyY2VzIGFycmF5cyB3aXRob3V0IFtrZXlzXVxuICAgICAgICAqKi9cbiAgICAgICAgc3RhdGljIGpzb25fYXJyYXkycmVzb3VyY2VzX2FycmF5KFxuICAgICAgICAgICAganNvbl9hcnJheTogW0pzb25hcGkuSURhdGFSZXNvdXJjZV0sXG4gICAgICAgICAgICBkZXN0aW5hdGlvbl9hcnJheT86IEFycmF5PEpzb25hcGkuSVJlc291cmNlPixcbiAgICAgICAgICAgIHVzZV9pZF9mb3Jfa2V5ID0gZmFsc2VcbiAgICAgICAgKTogIEFycmF5PEpzb25hcGkuSVJlc291cmNlPiB7XG4gICAgICAgICAgICBpZiAoIWRlc3RpbmF0aW9uX2FycmF5KSB7XG4gICAgICAgICAgICAgICAgZGVzdGluYXRpb25fYXJyYXkgPSBbXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAobGV0IGRhdGEgb2YganNvbl9hcnJheSkge1xuICAgICAgICAgICAgICAgIGxldCByZXNvdXJjZSA9IEpzb25hcGkuQ29udmVydGVyLmpzb24ycmVzb3VyY2UoZGF0YSwgZmFsc2UpO1xuICAgICAgICAgICAgICAgIGlmICh1c2VfaWRfZm9yX2tleSkge1xuICAgICAgICAgICAgICAgICAgICBkZXN0aW5hdGlvbl9hcnJheVtyZXNvdXJjZS5pZF0gPSByZXNvdXJjZTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBkZXN0aW5hdGlvbl9hcnJheS5wdXNoKHJlc291cmNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZGVzdGluYXRpb25fYXJyYXk7XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgQ29udmVydCBqc29uIGFycmF5cyAobGlrZSBpbmNsdWRlZCkgdG8gYW4gaW5kZXhlZCBSZXNvdXJjZXMgYXJyYXkgYnkgW3R5cGVdW2lkXVxuICAgICAgICAqKi9cbiAgICAgICAgc3RhdGljIGpzb25fYXJyYXkycmVzb3VyY2VzX2FycmF5X2J5X3R5cGUgKFxuICAgICAgICAgICAganNvbl9hcnJheTogW0pzb25hcGkuSURhdGFSZXNvdXJjZV0sXG4gICAgICAgICAgICBpbnN0YW5jZV9yZWxhdGlvbnNoaXBzOiBib29sZWFuXG4gICAgICAgICk6ICBBcnJheTxKc29uYXBpLklSZXNvdXJjZT4ge1xuICAgICAgICAgICAgbGV0IGFsbF9yZXNvdXJjZXMgPSBbXTtcbiAgICAgICAgICAgIENvbnZlcnRlci5qc29uX2FycmF5MnJlc291cmNlc19hcnJheShqc29uX2FycmF5LCBhbGxfcmVzb3VyY2VzLCBmYWxzZSk7XG4gICAgICAgICAgICBsZXQgcmVzb3VyY2VzID0gW107XG4gICAgICAgICAgICBhbmd1bGFyLmZvckVhY2goYWxsX3Jlc291cmNlcywgKHJlc291cmNlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKCEocmVzb3VyY2UudHlwZSBpbiByZXNvdXJjZXMpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc291cmNlc1tyZXNvdXJjZS50eXBlXSA9IFtdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXNvdXJjZXNbcmVzb3VyY2UudHlwZV1bcmVzb3VyY2UuaWRdID0gcmVzb3VyY2U7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgcmV0dXJuIHJlc291cmNlcztcbiAgICAgICAgfVxuXG4gICAgICAgIHN0YXRpYyBqc29uMnJlc291cmNlKGpzb25fcmVzb3VyY2U6IEpzb25hcGkuSURhdGFSZXNvdXJjZSwgaW5zdGFuY2VfcmVsYXRpb25zaGlwcyk6IEpzb25hcGkuSVJlc291cmNlIHtcbiAgICAgICAgICAgIGxldCByZXNvdXJjZV9zZXJ2aWNlID0gSnNvbmFwaS5Db252ZXJ0ZXIuZ2V0U2VydmljZShqc29uX3Jlc291cmNlLnR5cGUpO1xuICAgICAgICAgICAgaWYgKHJlc291cmNlX3NlcnZpY2UpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gSnNvbmFwaS5Db252ZXJ0ZXIucHJvY3JlYXRlKHJlc291cmNlX3NlcnZpY2UsIGpzb25fcmVzb3VyY2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgc3RhdGljIGdldFNlcnZpY2UodHlwZTogc3RyaW5nKTogSnNvbmFwaS5JUmVzb3VyY2Uge1xuICAgICAgICAgICAgbGV0IHJlc291cmNlX3NlcnZpY2UgPSBKc29uYXBpLkNvcmUuTWUuZ2V0UmVzb3VyY2UodHlwZSk7XG4gICAgICAgICAgICBpZiAoYW5ndWxhci5pc1VuZGVmaW5lZChyZXNvdXJjZV9zZXJ2aWNlKSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybignSnNvbmFwaSBSZXNvdXJjZSB0eXBlIGAnICsgdHlwZSArICdgIGlzIG5vdCBkZWZpbmRlZC4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiByZXNvdXJjZV9zZXJ2aWNlO1xuICAgICAgICB9XG5cbiAgICAgICAgc3RhdGljIHByb2NyZWF0ZShyZXNvdXJjZV9zZXJ2aWNlOiBKc29uYXBpLklSZXNvdXJjZSwgZGF0YTogSnNvbmFwaS5JRGF0YVJlc291cmNlKTogSnNvbmFwaS5JUmVzb3VyY2Uge1xuICAgICAgICAgICAgaWYgKCEoJ3R5cGUnIGluIGRhdGEgJiYgJ2lkJyBpbiBkYXRhKSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0pzb25hcGkgUmVzb3VyY2UgaXMgbm90IGNvcnJlY3QnLCBkYXRhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGxldCByZXNvdXJjZSA9IG5ldyAoPGFueT5yZXNvdXJjZV9zZXJ2aWNlLmNvbnN0cnVjdG9yKSgpO1xuICAgICAgICAgICAgcmVzb3VyY2UubmV3KCk7XG4gICAgICAgICAgICByZXNvdXJjZS5pZCA9IGRhdGEuaWQ7XG4gICAgICAgICAgICByZXNvdXJjZS5hdHRyaWJ1dGVzID0gZGF0YS5hdHRyaWJ1dGVzO1xuICAgICAgICAgICAgcmV0dXJuIHJlc291cmNlO1xuICAgICAgICB9XG5cbiAgICB9XG59XG4iLCJ2YXIgSnNvbmFwaTtcbihmdW5jdGlvbiAoSnNvbmFwaSkge1xuICAgIHZhciBDb252ZXJ0ZXIgPSAoZnVuY3Rpb24gKCkge1xuICAgICAgICBmdW5jdGlvbiBDb252ZXJ0ZXIoKSB7XG4gICAgICAgIH1cbiAgICAgICAgLyoqXG4gICAgICAgIENvbnZlcnQganNvbiBhcnJheXMgKGxpa2UgaW5jbHVkZWQpIHRvIGFuIFJlc291cmNlcyBhcnJheXMgd2l0aG91dCBba2V5c11cbiAgICAgICAgKiovXG4gICAgICAgIENvbnZlcnRlci5qc29uX2FycmF5MnJlc291cmNlc19hcnJheSA9IGZ1bmN0aW9uIChqc29uX2FycmF5LCBkZXN0aW5hdGlvbl9hcnJheSwgdXNlX2lkX2Zvcl9rZXkpIHtcbiAgICAgICAgICAgIGlmICh1c2VfaWRfZm9yX2tleSA9PT0gdm9pZCAwKSB7IHVzZV9pZF9mb3Jfa2V5ID0gZmFsc2U7IH1cbiAgICAgICAgICAgIGlmICghZGVzdGluYXRpb25fYXJyYXkpIHtcbiAgICAgICAgICAgICAgICBkZXN0aW5hdGlvbl9hcnJheSA9IFtdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yICh2YXIgX2kgPSAwLCBqc29uX2FycmF5XzEgPSBqc29uX2FycmF5OyBfaSA8IGpzb25fYXJyYXlfMS5sZW5ndGg7IF9pKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgZGF0YSA9IGpzb25fYXJyYXlfMVtfaV07XG4gICAgICAgICAgICAgICAgdmFyIHJlc291cmNlID0gSnNvbmFwaS5Db252ZXJ0ZXIuanNvbjJyZXNvdXJjZShkYXRhLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgaWYgKHVzZV9pZF9mb3Jfa2V5KSB7XG4gICAgICAgICAgICAgICAgICAgIGRlc3RpbmF0aW9uX2FycmF5W3Jlc291cmNlLmlkXSA9IHJlc291cmNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZGVzdGluYXRpb25fYXJyYXkucHVzaChyZXNvdXJjZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGRlc3RpbmF0aW9uX2FycmF5O1xuICAgICAgICB9O1xuICAgICAgICAvKipcbiAgICAgICAgQ29udmVydCBqc29uIGFycmF5cyAobGlrZSBpbmNsdWRlZCkgdG8gYW4gaW5kZXhlZCBSZXNvdXJjZXMgYXJyYXkgYnkgW3R5cGVdW2lkXVxuICAgICAgICAqKi9cbiAgICAgICAgQ29udmVydGVyLmpzb25fYXJyYXkycmVzb3VyY2VzX2FycmF5X2J5X3R5cGUgPSBmdW5jdGlvbiAoanNvbl9hcnJheSwgaW5zdGFuY2VfcmVsYXRpb25zaGlwcykge1xuICAgICAgICAgICAgdmFyIGFsbF9yZXNvdXJjZXMgPSBbXTtcbiAgICAgICAgICAgIENvbnZlcnRlci5qc29uX2FycmF5MnJlc291cmNlc19hcnJheShqc29uX2FycmF5LCBhbGxfcmVzb3VyY2VzLCBmYWxzZSk7XG4gICAgICAgICAgICB2YXIgcmVzb3VyY2VzID0gW107XG4gICAgICAgICAgICBhbmd1bGFyLmZvckVhY2goYWxsX3Jlc291cmNlcywgZnVuY3Rpb24gKHJlc291cmNlKSB7XG4gICAgICAgICAgICAgICAgaWYgKCEocmVzb3VyY2UudHlwZSBpbiByZXNvdXJjZXMpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc291cmNlc1tyZXNvdXJjZS50eXBlXSA9IFtdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXNvdXJjZXNbcmVzb3VyY2UudHlwZV1bcmVzb3VyY2UuaWRdID0gcmVzb3VyY2U7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiByZXNvdXJjZXM7XG4gICAgICAgIH07XG4gICAgICAgIENvbnZlcnRlci5qc29uMnJlc291cmNlID0gZnVuY3Rpb24gKGpzb25fcmVzb3VyY2UsIGluc3RhbmNlX3JlbGF0aW9uc2hpcHMpIHtcbiAgICAgICAgICAgIHZhciByZXNvdXJjZV9zZXJ2aWNlID0gSnNvbmFwaS5Db252ZXJ0ZXIuZ2V0U2VydmljZShqc29uX3Jlc291cmNlLnR5cGUpO1xuICAgICAgICAgICAgaWYgKHJlc291cmNlX3NlcnZpY2UpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gSnNvbmFwaS5Db252ZXJ0ZXIucHJvY3JlYXRlKHJlc291cmNlX3NlcnZpY2UsIGpzb25fcmVzb3VyY2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBDb252ZXJ0ZXIuZ2V0U2VydmljZSA9IGZ1bmN0aW9uICh0eXBlKSB7XG4gICAgICAgICAgICB2YXIgcmVzb3VyY2Vfc2VydmljZSA9IEpzb25hcGkuQ29yZS5NZS5nZXRSZXNvdXJjZSh0eXBlKTtcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmlzVW5kZWZpbmVkKHJlc291cmNlX3NlcnZpY2UpKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdKc29uYXBpIFJlc291cmNlIHR5cGUgYCcgKyB0eXBlICsgJ2AgaXMgbm90IGRlZmluZGVkLicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJlc291cmNlX3NlcnZpY2U7XG4gICAgICAgIH07XG4gICAgICAgIENvbnZlcnRlci5wcm9jcmVhdGUgPSBmdW5jdGlvbiAocmVzb3VyY2Vfc2VydmljZSwgZGF0YSkge1xuICAgICAgICAgICAgaWYgKCEoJ3R5cGUnIGluIGRhdGEgJiYgJ2lkJyBpbiBkYXRhKSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0pzb25hcGkgUmVzb3VyY2UgaXMgbm90IGNvcnJlY3QnLCBkYXRhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciByZXNvdXJjZSA9IG5ldyByZXNvdXJjZV9zZXJ2aWNlLmNvbnN0cnVjdG9yKCk7XG4gICAgICAgICAgICByZXNvdXJjZS5uZXcoKTtcbiAgICAgICAgICAgIHJlc291cmNlLmlkID0gZGF0YS5pZDtcbiAgICAgICAgICAgIHJlc291cmNlLmF0dHJpYnV0ZXMgPSBkYXRhLmF0dHJpYnV0ZXM7XG4gICAgICAgICAgICByZXR1cm4gcmVzb3VyY2U7XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBDb252ZXJ0ZXI7XG4gICAgfSgpKTtcbiAgICBKc29uYXBpLkNvbnZlcnRlciA9IENvbnZlcnRlcjtcbn0pKEpzb25hcGkgfHwgKEpzb25hcGkgPSB7fSkpO1xuIiwibW9kdWxlIEpzb25hcGkge1xuICAgIGV4cG9ydCBjbGFzcyBDb3JlIGltcGxlbWVudHMgSnNvbmFwaS5JQ29yZSB7XG4gICAgICAgIHB1YmxpYyByb290UGF0aDogc3RyaW5nID0gJ2h0dHA6Ly9yZXllc29mdC5kZG5zLm5ldDo5OTk5L2FwaS92MS9jb21wYW5pZXMvMic7XG4gICAgICAgIHB1YmxpYyByZXNvdXJjZXM6IEFycmF5PEpzb25hcGkuSVJlc291cmNlPiA9IFtdO1xuXG4gICAgICAgIHB1YmxpYyBsb2FkaW5nc0NvdW50ZXI6IG51bWJlciA9IDA7XG4gICAgICAgIHB1YmxpYyBsb2FkaW5nc1N0YXJ0ID0gKCkgPT4ge307XG4gICAgICAgIHB1YmxpYyBsb2FkaW5nc0RvbmUgPSAoKSA9PiB7fTtcblxuICAgICAgICBwdWJsaWMgc3RhdGljIE1lOiBKc29uYXBpLklDb3JlID0gbnVsbDtcbiAgICAgICAgcHVibGljIHN0YXRpYyBTZXJ2aWNlczogYW55ID0gbnVsbDtcblxuICAgICAgICAvKiogQG5nSW5qZWN0ICovXG4gICAgICAgIHB1YmxpYyBjb25zdHJ1Y3RvcihcbiAgICAgICAgICAgIHByb3RlY3RlZCByc0pzb25hcGlDb25maWcsXG4gICAgICAgICAgICBwcm90ZWN0ZWQgSnNvbmFwaUNvcmVTZXJ2aWNlc1xuICAgICAgICApIHtcbiAgICAgICAgICAgIEpzb25hcGkuQ29yZS5NZSA9IHRoaXM7XG4gICAgICAgICAgICBKc29uYXBpLkNvcmUuU2VydmljZXMgPSBKc29uYXBpQ29yZVNlcnZpY2VzO1xuICAgICAgICB9XG5cbiAgICAgICAgcHVibGljIF9yZWdpc3RlcihjbGFzZSk6IGJvb2xlYW4ge1xuICAgICAgICAgICAgaWYgKGNsYXNlLnR5cGUgaW4gdGhpcy5yZXNvdXJjZXMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLnJlc291cmNlc1tjbGFzZS50eXBlXSA9IGNsYXNlO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICBwdWJsaWMgZ2V0UmVzb3VyY2UodHlwZTogc3RyaW5nKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5yZXNvdXJjZXNbdHlwZV07XG4gICAgICAgIH1cblxuICAgICAgICBwdWJsaWMgcmVmcmVzaExvYWRpbmdzKGZhY3RvcjogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgICAgICB0aGlzLmxvYWRpbmdzQ291bnRlciArPSBmYWN0b3I7XG4gICAgICAgICAgICBpZiAodGhpcy5sb2FkaW5nc0NvdW50ZXIgPT09IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLmxvYWRpbmdzRG9uZSgpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzLmxvYWRpbmdzQ291bnRlciA9PT0gMSkge1xuICAgICAgICAgICAgICAgIHRoaXMubG9hZGluZ3NTdGFydCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIGFuZ3VsYXIubW9kdWxlKCdKc29uYXBpLnNlcnZpY2VzJykuc2VydmljZSgnSnNvbmFwaUNvcmUnLCBDb3JlKTtcbn1cbiIsInZhciBKc29uYXBpO1xuKGZ1bmN0aW9uIChKc29uYXBpKSB7XG4gICAgdmFyIENvcmUgPSAoZnVuY3Rpb24gKCkge1xuICAgICAgICAvKiogQG5nSW5qZWN0ICovXG4gICAgICAgIGZ1bmN0aW9uIENvcmUocnNKc29uYXBpQ29uZmlnLCBKc29uYXBpQ29yZVNlcnZpY2VzKSB7XG4gICAgICAgICAgICB0aGlzLnJzSnNvbmFwaUNvbmZpZyA9IHJzSnNvbmFwaUNvbmZpZztcbiAgICAgICAgICAgIHRoaXMuSnNvbmFwaUNvcmVTZXJ2aWNlcyA9IEpzb25hcGlDb3JlU2VydmljZXM7XG4gICAgICAgICAgICB0aGlzLnJvb3RQYXRoID0gJ2h0dHA6Ly9yZXllc29mdC5kZG5zLm5ldDo5OTk5L2FwaS92MS9jb21wYW5pZXMvMic7XG4gICAgICAgICAgICB0aGlzLnJlc291cmNlcyA9IFtdO1xuICAgICAgICAgICAgdGhpcy5sb2FkaW5nc0NvdW50ZXIgPSAwO1xuICAgICAgICAgICAgdGhpcy5sb2FkaW5nc1N0YXJ0ID0gZnVuY3Rpb24gKCkgeyB9O1xuICAgICAgICAgICAgdGhpcy5sb2FkaW5nc0RvbmUgPSBmdW5jdGlvbiAoKSB7IH07XG4gICAgICAgICAgICBKc29uYXBpLkNvcmUuTWUgPSB0aGlzO1xuICAgICAgICAgICAgSnNvbmFwaS5Db3JlLlNlcnZpY2VzID0gSnNvbmFwaUNvcmVTZXJ2aWNlcztcbiAgICAgICAgfVxuICAgICAgICBDb3JlLnByb3RvdHlwZS5fcmVnaXN0ZXIgPSBmdW5jdGlvbiAoY2xhc2UpIHtcbiAgICAgICAgICAgIGlmIChjbGFzZS50eXBlIGluIHRoaXMucmVzb3VyY2VzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5yZXNvdXJjZXNbY2xhc2UudHlwZV0gPSBjbGFzZTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9O1xuICAgICAgICBDb3JlLnByb3RvdHlwZS5nZXRSZXNvdXJjZSA9IGZ1bmN0aW9uICh0eXBlKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5yZXNvdXJjZXNbdHlwZV07XG4gICAgICAgIH07XG4gICAgICAgIENvcmUucHJvdG90eXBlLnJlZnJlc2hMb2FkaW5ncyA9IGZ1bmN0aW9uIChmYWN0b3IpIHtcbiAgICAgICAgICAgIHRoaXMubG9hZGluZ3NDb3VudGVyICs9IGZhY3RvcjtcbiAgICAgICAgICAgIGlmICh0aGlzLmxvYWRpbmdzQ291bnRlciA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMubG9hZGluZ3NEb25lKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmICh0aGlzLmxvYWRpbmdzQ291bnRlciA9PT0gMSkge1xuICAgICAgICAgICAgICAgIHRoaXMubG9hZGluZ3NTdGFydCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBDb3JlLk1lID0gbnVsbDtcbiAgICAgICAgQ29yZS5TZXJ2aWNlcyA9IG51bGw7XG4gICAgICAgIHJldHVybiBDb3JlO1xuICAgIH0oKSk7XG4gICAgSnNvbmFwaS5Db3JlID0gQ29yZTtcbiAgICBhbmd1bGFyLm1vZHVsZSgnSnNvbmFwaS5zZXJ2aWNlcycpLnNlcnZpY2UoJ0pzb25hcGlDb3JlJywgQ29yZSk7XG59KShKc29uYXBpIHx8IChKc29uYXBpID0ge30pKTtcbiIsIm1vZHVsZSBKc29uYXBpIHtcbiAgICBleHBvcnQgY2xhc3MgUmVzb3VyY2UgaW1wbGVtZW50cyBJUmVzb3VyY2Uge1xuICAgICAgICBwdWJsaWMgc2NoZW1hOiBJU2NoZW1hO1xuICAgICAgICBwcm90ZWN0ZWQgcGF0aDogc3RyaW5nID0gbnVsbDsgICAvLyB3aXRob3V0IHNsYXNoZXNcblxuICAgICAgICBwdWJsaWMgdHlwZTogc3RyaW5nO1xuICAgICAgICBwdWJsaWMgaWQ6IHN0cmluZztcbiAgICAgICAgcHVibGljIGF0dHJpYnV0ZXM6IGFueSA7XG4gICAgICAgIHB1YmxpYyByZWxhdGlvbnNoaXBzOiBhbnkgPSBbXTtcblxuICAgICAgICBwcml2YXRlIHBhcmFtc19iYXNlOiBKc29uYXBpLklQYXJhbXMgPSB7XG4gICAgICAgICAgICBpZDogJycsXG4gICAgICAgICAgICBpbmNsdWRlOiBbXVxuICAgICAgICB9O1xuXG4gICAgICAgIHB1YmxpYyBjbG9uZSgpOiBhbnkge1xuICAgICAgICAgICAgdmFyIGNsb25lT2JqID0gbmV3ICg8YW55PnRoaXMuY29uc3RydWN0b3IpKCk7XG4gICAgICAgICAgICBmb3IgKHZhciBhdHRyaWJ1dCBpbiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiB0aGlzW2F0dHJpYnV0XSAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICAgICAgY2xvbmVPYmpbYXR0cmlidXRdID0gdGhpc1thdHRyaWJ1dF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGNsb25lT2JqO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgIFJlZ2lzdGVyIHNjaGVtYSBvbiBKc29uYXBpLkNvcmVcbiAgICAgICAgQHJldHVybiB0cnVlIGlmIHRoZSByZXNvdXJjZSBkb24ndCBleGlzdCBhbmQgcmVnaXN0ZXJlZCBva1xuICAgICAgICAqKi9cbiAgICAgICAgcHVibGljIHJlZ2lzdGVyKCk6IGJvb2xlYW4ge1xuICAgICAgICAgICAgcmV0dXJuIEpzb25hcGkuQ29yZS5NZS5fcmVnaXN0ZXIodGhpcyk7XG4gICAgICAgIH1cblxuICAgICAgICBwdWJsaWMgZ2V0UGF0aCgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnBhdGggPyB0aGlzLnBhdGggOiB0aGlzLnR5cGU7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBlbXB0eSBzZWxmIG9iamVjdFxuICAgICAgICBwdWJsaWMgbmV3KCk6IElSZXNvdXJjZSB7XG4gICAgICAgICAgICBsZXQgcmVzb3VyY2UgPSB0aGlzLmNsb25lKCk7XG4gICAgICAgICAgICByZXNvdXJjZS5yZXNldCgpO1xuICAgICAgICAgICAgcmV0dXJuIHJlc291cmNlO1xuICAgICAgICB9XG5cbiAgICAgICAgcHVibGljIHJlc2V0KCk6IHZvaWQge1xuICAgICAgICAgICAgbGV0IHh0aGlzID0gdGhpcztcbiAgICAgICAgICAgIHRoaXMuaWQgPSAnJztcbiAgICAgICAgICAgIHRoaXMuYXR0cmlidXRlcyA9IHt9O1xuICAgICAgICAgICAgdGhpcy5yZWxhdGlvbnNoaXBzID0ge307XG4gICAgICAgICAgICBhbmd1bGFyLmZvckVhY2godGhpcy5zY2hlbWEucmVsYXRpb25zaGlwcywgKHZhbHVlLCBrZXkpID0+IHtcbiAgICAgICAgICAgICAgICB4dGhpcy5yZWxhdGlvbnNoaXBzW2tleV0gPSB7fTtcbiAgICAgICAgICAgICAgICB4dGhpcy5yZWxhdGlvbnNoaXBzW2tleV1bJ2RhdGEnXSA9IHt9O1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBwdWJsaWMgdG9PYmplY3QocGFyYW1zOiBKc29uYXBpLklQYXJhbXMpOiBKc29uYXBpLklEYXRhT2JqZWN0IHtcbiAgICAgICAgICAgIGxldCByZWxhdGlvbnNoaXBzID0geyB9O1xuICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKHRoaXMucmVsYXRpb25zaGlwcywgKHJlbGF0aW9uc2hpcCwgcmVsYXRpb25fYWxpYXMpID0+IHtcbiAgICAgICAgICAgICAgICByZWxhdGlvbnNoaXBzW3JlbGF0aW9uX2FsaWFzXSA9IHsgZGF0YTogW10gfTtcbiAgICAgICAgICAgICAgICBhbmd1bGFyLmZvckVhY2gocmVsYXRpb25zaGlwLmRhdGEsIChyZXNvdXJjZTogSnNvbmFwaS5JUmVzb3VyY2UpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHJlYXRpb25hbF9vYmplY3QgPSB7IGlkOiByZXNvdXJjZS5pZCwgdHBlOiByZXNvdXJjZS50eXBlIH07XG4gICAgICAgICAgICAgICAgICAgIHJlbGF0aW9uc2hpcHNbcmVsYXRpb25fYWxpYXNdWydkYXRhJ10ucHVzaChyZWF0aW9uYWxfb2JqZWN0KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogdGhpcy50eXBlLFxuICAgICAgICAgICAgICAgICAgICBpZDogdGhpcy5pZCxcbiAgICAgICAgICAgICAgICAgICAgYXR0cmlidXRlczogdGhpcy5hdHRyaWJ1dGVzLFxuICAgICAgICAgICAgICAgICAgICByZWxhdGlvbnNoaXBzOiByZWxhdGlvbnNoaXBzXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBpbmNsdWRlOiB7XG5cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgLy9yZXR1cm4gb2JqZWN0O1xuICAgICAgICB9XG5cbiAgICAgICAgcHVibGljIGdldChpZDogU3RyaW5nLCBwYXJhbXM/LCBmY19zdWNjZXNzPywgZmNfZXJyb3I/KTogSVJlc291cmNlIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9fZXhlYyhpZCwgcGFyYW1zLCBmY19zdWNjZXNzLCBmY19lcnJvciwgJ2dldCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgcHVibGljIGFsbChwYXJhbXM/LCBmY19zdWNjZXNzPywgZmNfZXJyb3I/KTogQXJyYXk8SVJlc291cmNlPiB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fX2V4ZWMobnVsbCwgcGFyYW1zLCBmY19zdWNjZXNzLCBmY19lcnJvciwgJ2FsbCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgcHVibGljIHNhdmUocGFyYW1zPywgZmNfc3VjY2Vzcz8sIGZjX2Vycm9yPyk6IEFycmF5PElSZXNvdXJjZT4ge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX19leGVjKG51bGwsIHBhcmFtcywgZmNfc3VjY2VzcywgZmNfZXJyb3IsICdzYXZlJyk7XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgVGhpcyBtZXRob2Qgc29ydCBwYXJhbXMgZm9yIG5ldygpLCBnZXQoKSBhbmQgdXBkYXRlKClcbiAgICAgICAgKi9cbiAgICAgICAgcHVibGljIF9fZXhlYyhpZDogU3RyaW5nLCBwYXJhbXM6IEpzb25hcGkuSVBhcmFtcywgZmNfc3VjY2VzcywgZmNfZXJyb3IsIGV4ZWNfdHlwZTogc3RyaW5nKTogYW55IHtcbiAgICAgICAgICAgIC8vIG1ha2VzIGBwYXJhbXNgIG9wdGlvbmFsXG4gICAgICAgICAgICBpZiAoYW5ndWxhci5pc0Z1bmN0aW9uKHBhcmFtcykpIHtcbiAgICAgICAgICAgICAgICBmY19lcnJvciA9IGZjX3N1Y2Nlc3M7XG4gICAgICAgICAgICAgICAgZmNfc3VjY2VzcyA9IHBhcmFtcztcbiAgICAgICAgICAgICAgICBwYXJhbXMgPSB0aGlzLnBhcmFtc19iYXNlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoYW5ndWxhci5pc1VuZGVmaW5lZChwYXJhbXMpKSB7XG4gICAgICAgICAgICAgICAgICAgIHBhcmFtcyA9IHRoaXMucGFyYW1zX2Jhc2U7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1zID0gYW5ndWxhci5leHRlbmQoe30sIHRoaXMucGFyYW1zX2Jhc2UsIHBhcmFtcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmY19zdWNjZXNzID0gYW5ndWxhci5pc0Z1bmN0aW9uKGZjX3N1Y2Nlc3MpID8gZmNfc3VjY2VzcyA6IGZ1bmN0aW9uICgpIHt9O1xuICAgICAgICAgICAgZmNfZXJyb3IgPSBhbmd1bGFyLmlzRnVuY3Rpb24oZmNfZXJyb3IpID8gZmNfZXJyb3IgOiBmdW5jdGlvbiAoKSB7fTtcblxuICAgICAgICAgICAgc3dpdGNoIChleGVjX3R5cGUpIHtcbiAgICAgICAgICAgICAgICBjYXNlICdnZXQnOlxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9nZXQoaWQsIHBhcmFtcywgZmNfc3VjY2VzcywgZmNfZXJyb3IpO1xuICAgICAgICAgICAgICAgIGNhc2UgJ2FsbCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2FsbChwYXJhbXMsIGZjX3N1Y2Nlc3MsIGZjX2Vycm9yKTtcbiAgICAgICAgICAgICAgICBjYXNlICdzYXZlJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fc2F2ZShwYXJhbXMsIGZjX3N1Y2Nlc3MsIGZjX2Vycm9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHB1YmxpYyBfZ2V0KGlkOiBTdHJpbmcsIHBhcmFtcywgZmNfc3VjY2VzcywgZmNfZXJyb3IpOiBJUmVzb3VyY2Uge1xuICAgICAgICAgICAgLy8gaHR0cCByZXF1ZXN0XG4gICAgICAgICAgICBsZXQgcGF0aCA9IG5ldyBKc29uYXBpLlBhdGhNYWtlcigpO1xuICAgICAgICAgICAgcGF0aC5hZGRQYXRoKHRoaXMuZ2V0UGF0aCgpKTtcbiAgICAgICAgICAgIHBhdGguYWRkUGF0aChpZCk7XG4gICAgICAgICAgICBwYXJhbXMuaW5jbHVkZSA/IHBhdGguc2V0SW5jbHVkZShwYXJhbXMuaW5jbHVkZSkgOiBudWxsO1xuXG4gICAgICAgICAgICAvL2xldCByZXNvdXJjZSA9IG5ldyBSZXNvdXJjZSgpO1xuICAgICAgICAgICAgbGV0IHJlc291cmNlID0gdGhpcy5uZXcoKTtcblxuICAgICAgICAgICAgbGV0IHByb21pc2UgPSBKc29uYXBpLkNvcmUuU2VydmljZXMuSnNvbmFwaUh0dHAuZ2V0KHBhdGguZ2V0KCkpO1xuICAgICAgICAgICAgcHJvbWlzZS50aGVuKFxuICAgICAgICAgICAgICAgIHN1Y2Nlc3MgPT4ge1xuICAgICAgICAgICAgICAgICAgICBsZXQgdmFsdWUgPSBzdWNjZXNzLmRhdGEuZGF0YTtcbiAgICAgICAgICAgICAgICAgICAgcmVzb3VyY2UuYXR0cmlidXRlcyA9IHZhbHVlLmF0dHJpYnV0ZXM7XG4gICAgICAgICAgICAgICAgICAgIHJlc291cmNlLmlkID0gdmFsdWUuaWQ7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gaW5zdGFuY2lvIGxvcyBpbmNsdWRlIHkgbG9zIGd1YXJkbyBlbiBpbmNsdWRlZCBhcnJhcnlcbiAgICAgICAgICAgICAgICAgICAgbGV0IGluY2x1ZGVkID0gQ29udmVydGVyLmpzb25fYXJyYXkycmVzb3VyY2VzX2FycmF5X2J5X3R5cGUoc3VjY2Vzcy5kYXRhLmluY2x1ZGVkLCBmYWxzZSk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gcmVjb3JybyBsb3MgcmVsYXRpb25zaGlwcyBsZXZhbnRvIGVsIHNlcnZpY2UgY29ycmVzcG9uZGllbnRlXG4gICAgICAgICAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaCh2YWx1ZS5yZWxhdGlvbnNoaXBzLCAocmVsYXRpb25fdmFsdWUsIHJlbGF0aW9uX2tleSkgPT4ge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyByZWxhdGlvbiBpcyBpbiBzY2hlbWE/IGhhdmUgZGF0YSBvciBqdXN0IGxpbmtzP1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCEocmVsYXRpb25fa2V5IGluIHJlc291cmNlLnJlbGF0aW9uc2hpcHMpICYmICgnZGF0YScgaW4gcmVsYXRpb25fdmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKHJlc291cmNlLnR5cGUgKyAnLnJlbGF0aW9uc2hpcHMuJyArIHJlbGF0aW9uX2tleSArICcgcmVjZWl2ZWQsIGJ1dCBpcyBub3QgZGVmaW5lZCBvbiBzY2hlbWEuJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb3VyY2UucmVsYXRpb25zaGlwc1tyZWxhdGlvbl9rZXldID0geyBkYXRhOiBbXSB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgcmVzb3VyY2Vfc2VydmljZSA9IEpzb25hcGkuQ29udmVydGVyLmdldFNlcnZpY2UocmVsYXRpb25fa2V5KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXNvdXJjZV9zZXJ2aWNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gcmVjb3JybyBsb3MgcmVzb3VyY2VzIGRlbCByZWxhdGlvbiB0eXBlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHJlbGF0aW9uc2hpcF9yZXNvdXJjZXMgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhbmd1bGFyLmZvckVhY2gocmVsYXRpb25fdmFsdWUuZGF0YSwgKHJlc291cmNlX3ZhbHVlOiBKc29uYXBpLklEYXRhUmVzb3VyY2UpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gZXN0w6EgZW4gZWwgaW5jbHVkZWQ/XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCB0bXBfcmVzb3VyY2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXNvdXJjZV92YWx1ZS50eXBlIGluIGluY2x1ZGVkICYmIHJlc291cmNlX3ZhbHVlLmlkIGluIGluY2x1ZGVkW3Jlc291cmNlX3ZhbHVlLnR5cGVdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0bXBfcmVzb3VyY2UgPSBpbmNsdWRlZFtyZXNvdXJjZV92YWx1ZS50eXBlXVtyZXNvdXJjZV92YWx1ZS5pZF07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0bXBfcmVzb3VyY2UgPSBKc29uYXBpLkNvbnZlcnRlci5wcm9jcmVhdGUocmVzb3VyY2Vfc2VydmljZSwgcmVzb3VyY2VfdmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc291cmNlLnJlbGF0aW9uc2hpcHNbcmVsYXRpb25fa2V5XS5kYXRhW3RtcF9yZXNvdXJjZS5pZF0gPSB0bXBfcmVzb3VyY2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIGZjX3N1Y2Nlc3Moc3VjY2Vzcyk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBlcnJvciA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGZjX2Vycm9yKGVycm9yKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApO1xuXG4gICAgICAgICAgICByZXR1cm4gcmVzb3VyY2U7XG4gICAgICAgIH1cblxuICAgICAgICBwdWJsaWMgX2FsbChwYXJhbXMsIGZjX3N1Y2Nlc3MsIGZjX2Vycm9yKTogQXJyYXk8SVJlc291cmNlPiB7XG5cbiAgICAgICAgICAgIC8vIGh0dHAgcmVxdWVzdFxuICAgICAgICAgICAgbGV0IHBhdGggPSBuZXcgSnNvbmFwaS5QYXRoTWFrZXIoKTtcbiAgICAgICAgICAgIHBhdGguYWRkUGF0aCh0aGlzLmdldFBhdGgoKSk7XG4gICAgICAgICAgICBwYXJhbXMuaW5jbHVkZSA/IHBhdGguc2V0SW5jbHVkZShwYXJhbXMuaW5jbHVkZSkgOiBudWxsO1xuXG4gICAgICAgICAgICAvLyBtYWtlIHJlcXVlc3RcbiAgICAgICAgICAgIGxldCByZXNwb25zZSA9IFtdO1xuICAgICAgICAgICAgbGV0IHByb21pc2UgPSBKc29uYXBpLkNvcmUuU2VydmljZXMuSnNvbmFwaUh0dHAuZ2V0KHBhdGguZ2V0KCkpO1xuICAgICAgICAgICAgcHJvbWlzZS50aGVuKFxuICAgICAgICAgICAgICAgIHN1Y2Nlc3MgPT4ge1xuICAgICAgICAgICAgICAgICAgICBDb252ZXJ0ZXIuanNvbl9hcnJheTJyZXNvdXJjZXNfYXJyYXkoc3VjY2Vzcy5kYXRhLmRhdGEsIHJlc3BvbnNlLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgZmNfc3VjY2VzcyhzdWNjZXNzKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGVycm9yID0+IHtcbiAgICAgICAgICAgICAgICAgICAgZmNfZXJyb3IoZXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICByZXR1cm4gcmVzcG9uc2U7XG4gICAgICAgIH1cblxuICAgICAgICBwdWJsaWMgX3NhdmUocGFyYW1zPywgZmNfc3VjY2Vzcz8sIGZjX2Vycm9yPyk6IElSZXNvdXJjZSB7XG4gICAgICAgICAgICBsZXQgb2JqZWN0ID0gdGhpcy50b09iamVjdChwYXJhbXMpO1xuXG4gICAgICAgICAgICAvLyBodHRwIHJlcXVlc3RcbiAgICAgICAgICAgIGxldCBwYXRoID0gbmV3IEpzb25hcGkuUGF0aE1ha2VyKCk7XG4gICAgICAgICAgICBwYXRoLmFkZFBhdGgodGhpcy5nZXRQYXRoKCkpO1xuICAgICAgICAgICAgdGhpcy5pZCAmJiBwYXRoLmFkZFBhdGgodGhpcy5pZCk7XG4gICAgICAgICAgICBwYXJhbXMuaW5jbHVkZSA/IHBhdGguc2V0SW5jbHVkZShwYXJhbXMuaW5jbHVkZSkgOiBudWxsO1xuXG4gICAgICAgICAgICBsZXQgcmVzb3VyY2UgPSB0aGlzLm5ldygpO1xuXG4gICAgICAgICAgICBsZXQgcHJvbWlzZSA9IEpzb25hcGkuQ29yZS5TZXJ2aWNlcy5Kc29uYXBpSHR0cC5leGVjKHBhdGguZ2V0KCksIHRoaXMuaWQgPyAnUEFUQ0gnIDogJ1BPU1QnLCBvYmplY3QpO1xuXG4gICAgICAgICAgICBwcm9taXNlLnRoZW4oXG4gICAgICAgICAgICAgICAgc3VjY2VzcyA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGxldCB2YWx1ZSA9IHN1Y2Nlc3MuZGF0YS5kYXRhO1xuICAgICAgICAgICAgICAgICAgICByZXNvdXJjZS5hdHRyaWJ1dGVzID0gdmFsdWUuYXR0cmlidXRlcztcbiAgICAgICAgICAgICAgICAgICAgcmVzb3VyY2UuaWQgPSB2YWx1ZS5pZDtcblxuICAgICAgICAgICAgICAgICAgICAvLyBpbnN0YW5jaW8gbG9zIGluY2x1ZGUgeSBsb3MgZ3VhcmRvIGVuIGluY2x1ZGVkIGFycmFyeVxuICAgICAgICAgICAgICAgICAgICAvLyBsZXQgaW5jbHVkZWQgPSBDb252ZXJ0ZXIuanNvbl9hcnJheTJyZXNvdXJjZXNfYXJyYXlfYnlfdHlwZShzdWNjZXNzLmRhdGEuaW5jbHVkZWQsIGZhbHNlKTtcblxuICAgICAgICAgICAgICAgICAgICBmY19lcnJvcihzdWNjZXNzKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGVycm9yID0+IHtcbiAgICAgICAgICAgICAgICAgICAgZmNfZXJyb3IoZXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgIHJldHVybiByZXNvdXJjZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHB1YmxpYyBhZGRSZWxhdGlvbnNoaXAocmVzb3VyY2U6IEpzb25hcGkuSVJlc291cmNlLCB0eXBlX2FsaWFzPzogc3RyaW5nKSB7XG4gICAgICAgICAgICB0eXBlX2FsaWFzID0gKHR5cGVfYWxpYXMgPyB0eXBlX2FsaWFzIDogcmVzb3VyY2UudHlwZSk7XG4gICAgICAgICAgICBpZiAoISh0eXBlX2FsaWFzIGluIHRoaXMucmVsYXRpb25zaGlwcykpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJlbGF0aW9uc2hpcHNbdHlwZV9hbGlhc10gPSB7IGRhdGE6IHsgfSB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIXJlc291cmNlLmlkKSB7XG4gICAgICAgICAgICAgICAgcmVzb3VyY2UuaWQgPSAnbmV3XycgKyAoTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMTAwMDAwKSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMucmVsYXRpb25zaGlwc1t0eXBlX2FsaWFzXVsnZGF0YSddW3Jlc291cmNlLmlkXSA9IHJlc291cmNlO1xuICAgICAgICB9XG4gICAgfVxufVxuIiwidmFyIEpzb25hcGk7XG4oZnVuY3Rpb24gKEpzb25hcGkpIHtcbiAgICB2YXIgUmVzb3VyY2UgPSAoZnVuY3Rpb24gKCkge1xuICAgICAgICBmdW5jdGlvbiBSZXNvdXJjZSgpIHtcbiAgICAgICAgICAgIHRoaXMucGF0aCA9IG51bGw7IC8vIHdpdGhvdXQgc2xhc2hlc1xuICAgICAgICAgICAgdGhpcy5yZWxhdGlvbnNoaXBzID0gW107XG4gICAgICAgICAgICB0aGlzLnBhcmFtc19iYXNlID0ge1xuICAgICAgICAgICAgICAgIGlkOiAnJyxcbiAgICAgICAgICAgICAgICBpbmNsdWRlOiBbXVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBSZXNvdXJjZS5wcm90b3R5cGUuY2xvbmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgY2xvbmVPYmogPSBuZXcgdGhpcy5jb25zdHJ1Y3RvcigpO1xuICAgICAgICAgICAgZm9yICh2YXIgYXR0cmlidXQgaW4gdGhpcykge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgdGhpc1thdHRyaWJ1dF0gIT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgICAgIGNsb25lT2JqW2F0dHJpYnV0XSA9IHRoaXNbYXR0cmlidXRdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBjbG9uZU9iajtcbiAgICAgICAgfTtcbiAgICAgICAgLyoqXG4gICAgICAgIFJlZ2lzdGVyIHNjaGVtYSBvbiBKc29uYXBpLkNvcmVcbiAgICAgICAgQHJldHVybiB0cnVlIGlmIHRoZSByZXNvdXJjZSBkb24ndCBleGlzdCBhbmQgcmVnaXN0ZXJlZCBva1xuICAgICAgICAqKi9cbiAgICAgICAgUmVzb3VyY2UucHJvdG90eXBlLnJlZ2lzdGVyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIEpzb25hcGkuQ29yZS5NZS5fcmVnaXN0ZXIodGhpcyk7XG4gICAgICAgIH07XG4gICAgICAgIFJlc291cmNlLnByb3RvdHlwZS5nZXRQYXRoID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucGF0aCA/IHRoaXMucGF0aCA6IHRoaXMudHlwZTtcbiAgICAgICAgfTtcbiAgICAgICAgLy8gZW1wdHkgc2VsZiBvYmplY3RcbiAgICAgICAgUmVzb3VyY2UucHJvdG90eXBlLm5ldyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciByZXNvdXJjZSA9IHRoaXMuY2xvbmUoKTtcbiAgICAgICAgICAgIHJlc291cmNlLnJlc2V0KCk7XG4gICAgICAgICAgICByZXR1cm4gcmVzb3VyY2U7XG4gICAgICAgIH07XG4gICAgICAgIFJlc291cmNlLnByb3RvdHlwZS5yZXNldCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciB4dGhpcyA9IHRoaXM7XG4gICAgICAgICAgICB0aGlzLmlkID0gJyc7XG4gICAgICAgICAgICB0aGlzLmF0dHJpYnV0ZXMgPSB7fTtcbiAgICAgICAgICAgIHRoaXMucmVsYXRpb25zaGlwcyA9IHt9O1xuICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKHRoaXMuc2NoZW1hLnJlbGF0aW9uc2hpcHMsIGZ1bmN0aW9uICh2YWx1ZSwga2V5KSB7XG4gICAgICAgICAgICAgICAgeHRoaXMucmVsYXRpb25zaGlwc1trZXldID0ge307XG4gICAgICAgICAgICAgICAgeHRoaXMucmVsYXRpb25zaGlwc1trZXldWydkYXRhJ10gPSB7fTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgICAgICBSZXNvdXJjZS5wcm90b3R5cGUudG9PYmplY3QgPSBmdW5jdGlvbiAocGFyYW1zKSB7XG4gICAgICAgICAgICB2YXIgcmVsYXRpb25zaGlwcyA9IHt9O1xuICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKHRoaXMucmVsYXRpb25zaGlwcywgZnVuY3Rpb24gKHJlbGF0aW9uc2hpcCwgcmVsYXRpb25fYWxpYXMpIHtcbiAgICAgICAgICAgICAgICByZWxhdGlvbnNoaXBzW3JlbGF0aW9uX2FsaWFzXSA9IHsgZGF0YTogW10gfTtcbiAgICAgICAgICAgICAgICBhbmd1bGFyLmZvckVhY2gocmVsYXRpb25zaGlwLmRhdGEsIGZ1bmN0aW9uIChyZXNvdXJjZSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcmVhdGlvbmFsX29iamVjdCA9IHsgaWQ6IHJlc291cmNlLmlkLCB0cGU6IHJlc291cmNlLnR5cGUgfTtcbiAgICAgICAgICAgICAgICAgICAgcmVsYXRpb25zaGlwc1tyZWxhdGlvbl9hbGlhc11bJ2RhdGEnXS5wdXNoKHJlYXRpb25hbF9vYmplY3QpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogdGhpcy50eXBlLFxuICAgICAgICAgICAgICAgICAgICBpZDogdGhpcy5pZCxcbiAgICAgICAgICAgICAgICAgICAgYXR0cmlidXRlczogdGhpcy5hdHRyaWJ1dGVzLFxuICAgICAgICAgICAgICAgICAgICByZWxhdGlvbnNoaXBzOiByZWxhdGlvbnNoaXBzXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBpbmNsdWRlOiB7fVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIC8vcmV0dXJuIG9iamVjdDtcbiAgICAgICAgfTtcbiAgICAgICAgUmVzb3VyY2UucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIChpZCwgcGFyYW1zLCBmY19zdWNjZXNzLCBmY19lcnJvcikge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX19leGVjKGlkLCBwYXJhbXMsIGZjX3N1Y2Nlc3MsIGZjX2Vycm9yLCAnZ2V0Jyk7XG4gICAgICAgIH07XG4gICAgICAgIFJlc291cmNlLnByb3RvdHlwZS5hbGwgPSBmdW5jdGlvbiAocGFyYW1zLCBmY19zdWNjZXNzLCBmY19lcnJvcikge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX19leGVjKG51bGwsIHBhcmFtcywgZmNfc3VjY2VzcywgZmNfZXJyb3IsICdhbGwnKTtcbiAgICAgICAgfTtcbiAgICAgICAgUmVzb3VyY2UucHJvdG90eXBlLnNhdmUgPSBmdW5jdGlvbiAocGFyYW1zLCBmY19zdWNjZXNzLCBmY19lcnJvcikge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX19leGVjKG51bGwsIHBhcmFtcywgZmNfc3VjY2VzcywgZmNfZXJyb3IsICdzYXZlJyk7XG4gICAgICAgIH07XG4gICAgICAgIC8qKlxuICAgICAgICBUaGlzIG1ldGhvZCBzb3J0IHBhcmFtcyBmb3IgbmV3KCksIGdldCgpIGFuZCB1cGRhdGUoKVxuICAgICAgICAqL1xuICAgICAgICBSZXNvdXJjZS5wcm90b3R5cGUuX19leGVjID0gZnVuY3Rpb24gKGlkLCBwYXJhbXMsIGZjX3N1Y2Nlc3MsIGZjX2Vycm9yLCBleGVjX3R5cGUpIHtcbiAgICAgICAgICAgIC8vIG1ha2VzIGBwYXJhbXNgIG9wdGlvbmFsXG4gICAgICAgICAgICBpZiAoYW5ndWxhci5pc0Z1bmN0aW9uKHBhcmFtcykpIHtcbiAgICAgICAgICAgICAgICBmY19lcnJvciA9IGZjX3N1Y2Nlc3M7XG4gICAgICAgICAgICAgICAgZmNfc3VjY2VzcyA9IHBhcmFtcztcbiAgICAgICAgICAgICAgICBwYXJhbXMgPSB0aGlzLnBhcmFtc19iYXNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKGFuZ3VsYXIuaXNVbmRlZmluZWQocGFyYW1zKSkge1xuICAgICAgICAgICAgICAgICAgICBwYXJhbXMgPSB0aGlzLnBhcmFtc19iYXNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1zID0gYW5ndWxhci5leHRlbmQoe30sIHRoaXMucGFyYW1zX2Jhc2UsIHBhcmFtcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZmNfc3VjY2VzcyA9IGFuZ3VsYXIuaXNGdW5jdGlvbihmY19zdWNjZXNzKSA/IGZjX3N1Y2Nlc3MgOiBmdW5jdGlvbiAoKSB7IH07XG4gICAgICAgICAgICBmY19lcnJvciA9IGFuZ3VsYXIuaXNGdW5jdGlvbihmY19lcnJvcikgPyBmY19lcnJvciA6IGZ1bmN0aW9uICgpIHsgfTtcbiAgICAgICAgICAgIHN3aXRjaCAoZXhlY190eXBlKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAnZ2V0JzpcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2dldChpZCwgcGFyYW1zLCBmY19zdWNjZXNzLCBmY19lcnJvcik7XG4gICAgICAgICAgICAgICAgY2FzZSAnYWxsJzpcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2FsbChwYXJhbXMsIGZjX3N1Y2Nlc3MsIGZjX2Vycm9yKTtcbiAgICAgICAgICAgICAgICBjYXNlICdzYXZlJzpcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3NhdmUocGFyYW1zLCBmY19zdWNjZXNzLCBmY19lcnJvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIFJlc291cmNlLnByb3RvdHlwZS5fZ2V0ID0gZnVuY3Rpb24gKGlkLCBwYXJhbXMsIGZjX3N1Y2Nlc3MsIGZjX2Vycm9yKSB7XG4gICAgICAgICAgICAvLyBodHRwIHJlcXVlc3RcbiAgICAgICAgICAgIHZhciBwYXRoID0gbmV3IEpzb25hcGkuUGF0aE1ha2VyKCk7XG4gICAgICAgICAgICBwYXRoLmFkZFBhdGgodGhpcy5nZXRQYXRoKCkpO1xuICAgICAgICAgICAgcGF0aC5hZGRQYXRoKGlkKTtcbiAgICAgICAgICAgIHBhcmFtcy5pbmNsdWRlID8gcGF0aC5zZXRJbmNsdWRlKHBhcmFtcy5pbmNsdWRlKSA6IG51bGw7XG4gICAgICAgICAgICAvL2xldCByZXNvdXJjZSA9IG5ldyBSZXNvdXJjZSgpO1xuICAgICAgICAgICAgdmFyIHJlc291cmNlID0gdGhpcy5uZXcoKTtcbiAgICAgICAgICAgIHZhciBwcm9taXNlID0gSnNvbmFwaS5Db3JlLlNlcnZpY2VzLkpzb25hcGlIdHRwLmdldChwYXRoLmdldCgpKTtcbiAgICAgICAgICAgIHByb21pc2UudGhlbihmdW5jdGlvbiAoc3VjY2Vzcykge1xuICAgICAgICAgICAgICAgIHZhciB2YWx1ZSA9IHN1Y2Nlc3MuZGF0YS5kYXRhO1xuICAgICAgICAgICAgICAgIHJlc291cmNlLmF0dHJpYnV0ZXMgPSB2YWx1ZS5hdHRyaWJ1dGVzO1xuICAgICAgICAgICAgICAgIHJlc291cmNlLmlkID0gdmFsdWUuaWQ7XG4gICAgICAgICAgICAgICAgLy8gaW5zdGFuY2lvIGxvcyBpbmNsdWRlIHkgbG9zIGd1YXJkbyBlbiBpbmNsdWRlZCBhcnJhcnlcbiAgICAgICAgICAgICAgICB2YXIgaW5jbHVkZWQgPSBKc29uYXBpLkNvbnZlcnRlci5qc29uX2FycmF5MnJlc291cmNlc19hcnJheV9ieV90eXBlKHN1Y2Nlc3MuZGF0YS5pbmNsdWRlZCwgZmFsc2UpO1xuICAgICAgICAgICAgICAgIC8vIHJlY29ycm8gbG9zIHJlbGF0aW9uc2hpcHMgbGV2YW50byBlbCBzZXJ2aWNlIGNvcnJlc3BvbmRpZW50ZVxuICAgICAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaCh2YWx1ZS5yZWxhdGlvbnNoaXBzLCBmdW5jdGlvbiAocmVsYXRpb25fdmFsdWUsIHJlbGF0aW9uX2tleSkge1xuICAgICAgICAgICAgICAgICAgICAvLyByZWxhdGlvbiBpcyBpbiBzY2hlbWE/IGhhdmUgZGF0YSBvciBqdXN0IGxpbmtzP1xuICAgICAgICAgICAgICAgICAgICBpZiAoIShyZWxhdGlvbl9rZXkgaW4gcmVzb3VyY2UucmVsYXRpb25zaGlwcykgJiYgKCdkYXRhJyBpbiByZWxhdGlvbl92YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihyZXNvdXJjZS50eXBlICsgJy5yZWxhdGlvbnNoaXBzLicgKyByZWxhdGlvbl9rZXkgKyAnIHJlY2VpdmVkLCBidXQgaXMgbm90IGRlZmluZWQgb24gc2NoZW1hLicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb3VyY2UucmVsYXRpb25zaGlwc1tyZWxhdGlvbl9rZXldID0geyBkYXRhOiBbXSB9O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHZhciByZXNvdXJjZV9zZXJ2aWNlID0gSnNvbmFwaS5Db252ZXJ0ZXIuZ2V0U2VydmljZShyZWxhdGlvbl9rZXkpO1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVzb3VyY2Vfc2VydmljZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gcmVjb3JybyBsb3MgcmVzb3VyY2VzIGRlbCByZWxhdGlvbiB0eXBlXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcmVsYXRpb25zaGlwX3Jlc291cmNlcyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKHJlbGF0aW9uX3ZhbHVlLmRhdGEsIGZ1bmN0aW9uIChyZXNvdXJjZV92YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGVzdMOhIGVuIGVsIGluY2x1ZGVkP1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB0bXBfcmVzb3VyY2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlc291cmNlX3ZhbHVlLnR5cGUgaW4gaW5jbHVkZWQgJiYgcmVzb3VyY2VfdmFsdWUuaWQgaW4gaW5jbHVkZWRbcmVzb3VyY2VfdmFsdWUudHlwZV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG1wX3Jlc291cmNlID0gaW5jbHVkZWRbcmVzb3VyY2VfdmFsdWUudHlwZV1bcmVzb3VyY2VfdmFsdWUuaWRdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG1wX3Jlc291cmNlID0gSnNvbmFwaS5Db252ZXJ0ZXIucHJvY3JlYXRlKHJlc291cmNlX3NlcnZpY2UsIHJlc291cmNlX3ZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb3VyY2UucmVsYXRpb25zaGlwc1tyZWxhdGlvbl9rZXldLmRhdGFbdG1wX3Jlc291cmNlLmlkXSA9IHRtcF9yZXNvdXJjZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgZmNfc3VjY2VzcyhzdWNjZXNzKTtcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICAgICAgICAgIGZjX2Vycm9yKGVycm9yKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIHJlc291cmNlO1xuICAgICAgICB9O1xuICAgICAgICBSZXNvdXJjZS5wcm90b3R5cGUuX2FsbCA9IGZ1bmN0aW9uIChwYXJhbXMsIGZjX3N1Y2Nlc3MsIGZjX2Vycm9yKSB7XG4gICAgICAgICAgICAvLyBodHRwIHJlcXVlc3RcbiAgICAgICAgICAgIHZhciBwYXRoID0gbmV3IEpzb25hcGkuUGF0aE1ha2VyKCk7XG4gICAgICAgICAgICBwYXRoLmFkZFBhdGgodGhpcy5nZXRQYXRoKCkpO1xuICAgICAgICAgICAgcGFyYW1zLmluY2x1ZGUgPyBwYXRoLnNldEluY2x1ZGUocGFyYW1zLmluY2x1ZGUpIDogbnVsbDtcbiAgICAgICAgICAgIC8vIG1ha2UgcmVxdWVzdFxuICAgICAgICAgICAgdmFyIHJlc3BvbnNlID0gW107XG4gICAgICAgICAgICB2YXIgcHJvbWlzZSA9IEpzb25hcGkuQ29yZS5TZXJ2aWNlcy5Kc29uYXBpSHR0cC5nZXQocGF0aC5nZXQoKSk7XG4gICAgICAgICAgICBwcm9taXNlLnRoZW4oZnVuY3Rpb24gKHN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICBKc29uYXBpLkNvbnZlcnRlci5qc29uX2FycmF5MnJlc291cmNlc19hcnJheShzdWNjZXNzLmRhdGEuZGF0YSwgcmVzcG9uc2UsIHRydWUpO1xuICAgICAgICAgICAgICAgIGZjX3N1Y2Nlc3Moc3VjY2Vzcyk7XG4gICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBmY19lcnJvcihlcnJvcik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiByZXNwb25zZTtcbiAgICAgICAgfTtcbiAgICAgICAgUmVzb3VyY2UucHJvdG90eXBlLl9zYXZlID0gZnVuY3Rpb24gKHBhcmFtcywgZmNfc3VjY2VzcywgZmNfZXJyb3IpIHtcbiAgICAgICAgICAgIHZhciBvYmplY3QgPSB0aGlzLnRvT2JqZWN0KHBhcmFtcyk7XG4gICAgICAgICAgICAvLyBodHRwIHJlcXVlc3RcbiAgICAgICAgICAgIHZhciBwYXRoID0gbmV3IEpzb25hcGkuUGF0aE1ha2VyKCk7XG4gICAgICAgICAgICBwYXRoLmFkZFBhdGgodGhpcy5nZXRQYXRoKCkpO1xuICAgICAgICAgICAgdGhpcy5pZCAmJiBwYXRoLmFkZFBhdGgodGhpcy5pZCk7XG4gICAgICAgICAgICBwYXJhbXMuaW5jbHVkZSA/IHBhdGguc2V0SW5jbHVkZShwYXJhbXMuaW5jbHVkZSkgOiBudWxsO1xuICAgICAgICAgICAgdmFyIHJlc291cmNlID0gdGhpcy5uZXcoKTtcbiAgICAgICAgICAgIHZhciBwcm9taXNlID0gSnNvbmFwaS5Db3JlLlNlcnZpY2VzLkpzb25hcGlIdHRwLmV4ZWMocGF0aC5nZXQoKSwgdGhpcy5pZCA/ICdQQVRDSCcgOiAnUE9TVCcsIG9iamVjdCk7XG4gICAgICAgICAgICBwcm9taXNlLnRoZW4oZnVuY3Rpb24gKHN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICB2YXIgdmFsdWUgPSBzdWNjZXNzLmRhdGEuZGF0YTtcbiAgICAgICAgICAgICAgICByZXNvdXJjZS5hdHRyaWJ1dGVzID0gdmFsdWUuYXR0cmlidXRlcztcbiAgICAgICAgICAgICAgICByZXNvdXJjZS5pZCA9IHZhbHVlLmlkO1xuICAgICAgICAgICAgICAgIC8vIGluc3RhbmNpbyBsb3MgaW5jbHVkZSB5IGxvcyBndWFyZG8gZW4gaW5jbHVkZWQgYXJyYXJ5XG4gICAgICAgICAgICAgICAgLy8gbGV0IGluY2x1ZGVkID0gQ29udmVydGVyLmpzb25fYXJyYXkycmVzb3VyY2VzX2FycmF5X2J5X3R5cGUoc3VjY2Vzcy5kYXRhLmluY2x1ZGVkLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgZmNfZXJyb3Ioc3VjY2Vzcyk7XG4gICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBmY19lcnJvcihlcnJvcik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiByZXNvdXJjZTtcbiAgICAgICAgfTtcbiAgICAgICAgUmVzb3VyY2UucHJvdG90eXBlLmFkZFJlbGF0aW9uc2hpcCA9IGZ1bmN0aW9uIChyZXNvdXJjZSwgdHlwZV9hbGlhcykge1xuICAgICAgICAgICAgdHlwZV9hbGlhcyA9ICh0eXBlX2FsaWFzID8gdHlwZV9hbGlhcyA6IHJlc291cmNlLnR5cGUpO1xuICAgICAgICAgICAgaWYgKCEodHlwZV9hbGlhcyBpbiB0aGlzLnJlbGF0aW9uc2hpcHMpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yZWxhdGlvbnNoaXBzW3R5cGVfYWxpYXNdID0geyBkYXRhOiB7fSB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFyZXNvdXJjZS5pZCkge1xuICAgICAgICAgICAgICAgIHJlc291cmNlLmlkID0gJ25ld18nICsgKE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDEwMDAwMCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5yZWxhdGlvbnNoaXBzW3R5cGVfYWxpYXNdWydkYXRhJ11bcmVzb3VyY2UuaWRdID0gcmVzb3VyY2U7XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBSZXNvdXJjZTtcbiAgICB9KCkpO1xuICAgIEpzb25hcGkuUmVzb3VyY2UgPSBSZXNvdXJjZTtcbn0pKEpzb25hcGkgfHwgKEpzb25hcGkgPSB7fSkpO1xuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL3R5cGluZ3MvbWFpbi5kLnRzXCIgLz5cblxuLy8gSnNvbmFwaSBpbnRlcmZhY2VzIHBhcnQgb2YgdG9wIGxldmVsXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9pbnRlcmZhY2VzL2RvY3VtZW50LmQudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9pbnRlcmZhY2VzL2RhdGEtY29sbGVjdGlvbi5kLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vaW50ZXJmYWNlcy9kYXRhLW9iamVjdC5kLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vaW50ZXJmYWNlcy9kYXRhLXJlc291cmNlLmQudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9pbnRlcmZhY2VzL3BhcmFtcy5kLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vaW50ZXJmYWNlcy9lcnJvcnMuZC50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL2ludGVyZmFjZXMvbGlua3MuZC50c1wiLz5cblxuLy8gUGFyYW1ldGVycyBmb3IgVFMtSnNvbmFwaSBDbGFzc2VzXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9pbnRlcmZhY2VzL3NjaGVtYS5kLnRzXCIvPlxuXG4vLyBUUy1Kc29uYXBpIENsYXNzZXMgSW50ZXJmYWNlc1xuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vaW50ZXJmYWNlcy9jb3JlLmQudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9pbnRlcmZhY2VzL3Jlc291cmNlLmQudHNcIi8+XG5cbi8vIFRTLUpzb25hcGkgY2xhc3Nlc1xuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vYXBwLm1vZHVsZS50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL3NlcnZpY2VzL2h0dHAuc2VydmljZS50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL3NlcnZpY2VzL3BhdGgtbWFrZXIudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9zZXJ2aWNlcy9yZXNvdXJjZS1jb252ZXJ0ZXIudHNcIi8+XG4vLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vc2VydmljZXMvY29yZS1zZXJ2aWNlcy5zZXJ2aWNlLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vY29yZS50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL3Jlc291cmNlLnRzXCIvPlxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL3R5cGluZ3MvbWFpbi5kLnRzXCIgLz5cbi8vIEpzb25hcGkgaW50ZXJmYWNlcyBwYXJ0IG9mIHRvcCBsZXZlbFxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vaW50ZXJmYWNlcy9kb2N1bWVudC5kLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vaW50ZXJmYWNlcy9kYXRhLWNvbGxlY3Rpb24uZC50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL2ludGVyZmFjZXMvZGF0YS1vYmplY3QuZC50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL2ludGVyZmFjZXMvZGF0YS1yZXNvdXJjZS5kLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vaW50ZXJmYWNlcy9wYXJhbXMuZC50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL2ludGVyZmFjZXMvZXJyb3JzLmQudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9pbnRlcmZhY2VzL2xpbmtzLmQudHNcIi8+XG4vLyBQYXJhbWV0ZXJzIGZvciBUUy1Kc29uYXBpIENsYXNzZXNcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL2ludGVyZmFjZXMvc2NoZW1hLmQudHNcIi8+XG4vLyBUUy1Kc29uYXBpIENsYXNzZXMgSW50ZXJmYWNlc1xuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vaW50ZXJmYWNlcy9jb3JlLmQudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9pbnRlcmZhY2VzL3Jlc291cmNlLmQudHNcIi8+XG4vLyBUUy1Kc29uYXBpIGNsYXNzZXNcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL2FwcC5tb2R1bGUudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9zZXJ2aWNlcy9odHRwLnNlcnZpY2UudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9zZXJ2aWNlcy9wYXRoLW1ha2VyLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vc2VydmljZXMvcmVzb3VyY2UtY29udmVydGVyLnRzXCIvPlxuLy8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL3NlcnZpY2VzL2NvcmUtc2VydmljZXMuc2VydmljZS50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL2NvcmUudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9yZXNvdXJjZS50c1wiLz5cbiIsIm1vZHVsZSBKc29uYXBpIHtcbiAgICBleHBvcnQgY2xhc3MgQ29yZVNlcnZpY2VzIHtcblxuICAgICAgICAvKiogQG5nSW5qZWN0ICovXG4gICAgICAgIHB1YmxpYyBjb25zdHJ1Y3RvcihcbiAgICAgICAgICAgIHByb3RlY3RlZCBKc29uYXBpSHR0cFxuICAgICAgICApIHtcblxuICAgICAgICB9XG4gICAgfVxuXG4gICAgYW5ndWxhci5tb2R1bGUoJ0pzb25hcGkuc2VydmljZXMnKS5zZXJ2aWNlKCdKc29uYXBpQ29yZVNlcnZpY2VzJywgQ29yZVNlcnZpY2VzKTtcbn1cbiIsInZhciBKc29uYXBpO1xuKGZ1bmN0aW9uIChKc29uYXBpKSB7XG4gICAgdmFyIENvcmVTZXJ2aWNlcyA9IChmdW5jdGlvbiAoKSB7XG4gICAgICAgIC8qKiBAbmdJbmplY3QgKi9cbiAgICAgICAgZnVuY3Rpb24gQ29yZVNlcnZpY2VzKEpzb25hcGlIdHRwKSB7XG4gICAgICAgICAgICB0aGlzLkpzb25hcGlIdHRwID0gSnNvbmFwaUh0dHA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIENvcmVTZXJ2aWNlcztcbiAgICB9KCkpO1xuICAgIEpzb25hcGkuQ29yZVNlcnZpY2VzID0gQ29yZVNlcnZpY2VzO1xuICAgIGFuZ3VsYXIubW9kdWxlKCdKc29uYXBpLnNlcnZpY2VzJykuc2VydmljZSgnSnNvbmFwaUNvcmVTZXJ2aWNlcycsIENvcmVTZXJ2aWNlcyk7XG59KShKc29uYXBpIHx8IChKc29uYXBpID0ge30pKTtcbiIsIm1vZHVsZSBKc29uYXBpIHtcbiAgICBleHBvcnQgY2xhc3MgSnNvbmFwaVBhcnNlciB7XG5cbiAgICAgICAgLyoqIEBuZ0luamVjdCAqL1xuICAgICAgICBwdWJsaWMgY29uc3RydWN0b3IoKSB7XG5cbiAgICAgICAgfVxuXG4gICAgICAgIHB1YmxpYyB0b09iamVjdChqc29uX3N0cmluZzogc3RyaW5nKSB7XG4gICAgICAgICAgICByZXR1cm4ganNvbl9zdHJpbmc7XG4gICAgICAgIH1cbiAgICB9XG59XG4iLCJ2YXIgSnNvbmFwaTtcbihmdW5jdGlvbiAoSnNvbmFwaSkge1xuICAgIHZhciBKc29uYXBpUGFyc2VyID0gKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgLyoqIEBuZ0luamVjdCAqL1xuICAgICAgICBmdW5jdGlvbiBKc29uYXBpUGFyc2VyKCkge1xuICAgICAgICB9XG4gICAgICAgIEpzb25hcGlQYXJzZXIucHJvdG90eXBlLnRvT2JqZWN0ID0gZnVuY3Rpb24gKGpzb25fc3RyaW5nKSB7XG4gICAgICAgICAgICByZXR1cm4ganNvbl9zdHJpbmc7XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBKc29uYXBpUGFyc2VyO1xuICAgIH0oKSk7XG4gICAgSnNvbmFwaS5Kc29uYXBpUGFyc2VyID0gSnNvbmFwaVBhcnNlcjtcbn0pKEpzb25hcGkgfHwgKEpzb25hcGkgPSB7fSkpO1xuIiwibW9kdWxlIEpzb25hcGkge1xuICAgIGV4cG9ydCBjbGFzcyBKc29uYXBpU3RvcmFnZSB7XG5cbiAgICAgICAgLyoqIEBuZ0luamVjdCAqL1xuICAgICAgICBwdWJsaWMgY29uc3RydWN0b3IoXG4gICAgICAgICAgICAvLyBwcm90ZWN0ZWQgc3RvcmUsXG4gICAgICAgICAgICAvLyBwcm90ZWN0ZWQgUmVhbEpzb25hcGlcbiAgICAgICAgKSB7XG5cbiAgICAgICAgfVxuXG4gICAgICAgIHB1YmxpYyBnZXQoa2V5KSB7XG4gICAgICAgICAgICAvKiBsZXQgZGF0YSA9IHRoaXMuc3RvcmUuZ2V0KGtleSk7XG4gICAgICAgICAgICByZXR1cm4gYW5ndWxhci5mcm9tSnNvbihkYXRhKTsqL1xuICAgICAgICB9XG5cbiAgICAgICAgcHVibGljIG1lcmdlKGtleSwgZGF0YSkge1xuICAgICAgICAgICAgLyogbGV0IGFjdHVhbF9kYXRhID0gdGhpcy5nZXQoa2V5KTtcbiAgICAgICAgICAgIGxldCBhY3R1YWxfaW5mbyA9IGFuZ3VsYXIuZnJvbUpzb24oYWN0dWFsX2RhdGEpOyAqL1xuXG5cbiAgICAgICAgfVxuICAgIH1cbn1cbiIsInZhciBKc29uYXBpO1xuKGZ1bmN0aW9uIChKc29uYXBpKSB7XG4gICAgdmFyIEpzb25hcGlTdG9yYWdlID0gKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgLyoqIEBuZ0luamVjdCAqL1xuICAgICAgICBmdW5jdGlvbiBKc29uYXBpU3RvcmFnZSgpIHtcbiAgICAgICAgfVxuICAgICAgICBKc29uYXBpU3RvcmFnZS5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgICAgLyogbGV0IGRhdGEgPSB0aGlzLnN0b3JlLmdldChrZXkpO1xuICAgICAgICAgICAgcmV0dXJuIGFuZ3VsYXIuZnJvbUpzb24oZGF0YSk7Ki9cbiAgICAgICAgfTtcbiAgICAgICAgSnNvbmFwaVN0b3JhZ2UucHJvdG90eXBlLm1lcmdlID0gZnVuY3Rpb24gKGtleSwgZGF0YSkge1xuICAgICAgICAgICAgLyogbGV0IGFjdHVhbF9kYXRhID0gdGhpcy5nZXQoa2V5KTtcbiAgICAgICAgICAgIGxldCBhY3R1YWxfaW5mbyA9IGFuZ3VsYXIuZnJvbUpzb24oYWN0dWFsX2RhdGEpOyAqL1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gSnNvbmFwaVN0b3JhZ2U7XG4gICAgfSgpKTtcbiAgICBKc29uYXBpLkpzb25hcGlTdG9yYWdlID0gSnNvbmFwaVN0b3JhZ2U7XG59KShKc29uYXBpIHx8IChKc29uYXBpID0ge30pKTtcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
