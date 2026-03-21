export const Tokens = {
  Utils: {
    LoggerService: Symbol('LoggerService'),
    LogFormatter: Symbol('LogFormatter'),
    FileTransport: Symbol('FileTransport'),
  },
  Common: {
    Server: {
      HttpServer: Symbol('HttpServer'),
      HttpConfig: Symbol('HttpConfig'),
      RouterConfig: Symbol('RouterConfig'),
    },
    Service: {
      InitializerService: Symbol('InitializerService'),
      AppConfigurationService: Symbol('AppConfigurationService'),
      UrlService: Symbol('UrlService'),
    },
    Controller: {
      BaseController: Symbol('BaseController'),
    },
    DataLayer: {
      DatabaseService: Symbol('DatabaseService'),
      GenericDao: Symbol('GenericDao'),
    },
    App: Symbol('App'),
  },
};
