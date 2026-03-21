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
      StoreService: Symbol('StoreService'),
      AppConfigurationService: Symbol('AppConfigurationService'),
      UrlService: Symbol('UrlService'),
      AuthService: Symbol('AuthService'),
      PaymentService: Symbol('PaymentService'),
      EmailService: Symbol('EmailService'),
      SubscriptionService: Symbol('SubscriptionService'),
      SettingsService: Symbol('SettingsService'),
    },
    Controller: {
      BaseController: Symbol('BaseController'),
      StoreController: Symbol('StoreController'),
      AuthController: Symbol('AuthController'),
    },
    DataLayer: {
      DatabaseService: Symbol('DatabaseService'),
      GenericDao: Symbol('GenericDao'),
      StoreDao: Symbol('StoreDao'),
      UserRepository: Symbol('UserRepository'),
      StoreRepository: Symbol('StoreRepository'),
      PaymentRepository: Symbol('PaymentRepository'),
      StoreUserRepository: Symbol('StoreUserRepository'),
    },
    App: Symbol('App'),
  },
};
