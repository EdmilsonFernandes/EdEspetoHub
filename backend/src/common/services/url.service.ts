import { Tokens } from '../../ioc/injectiontokens';
import { Provide, Inject } from '../../ioc/ioc';
import { LoggerService } from '../../utils/logger';
import { BaseRouterDefinition } from '../../models/base-router.model';
import { HttpRequestMethod } from '../../models/http-request.model';

@Provide(Tokens.Common.Service.UrlService)
export class UrlService
{
    constructor(
      @Inject(Tokens.Utils.LoggerService) private readonly myLogger: LoggerService
    )
    { }

    public formatBaseUrl(httpMethod: HttpRequestMethod, controller: BaseRouterDefinition, provider: string): string
    {
      const formattedBaseResource = this.checkSlashes(provider);
      let formattedUrl = this.checkSlashes(controller.version);

      formattedUrl = formattedBaseResource
          ?
          `${this.checkSlashes(formattedBaseResource)}${this.checkSlashes(formattedUrl)}`.toLowerCase()
          :
          `${this.checkSlashes(formattedUrl)}`.toLowerCase();

      const url = `/${formattedUrl}${this.checkSlashes(controller.basePath)}${this.checkSlashes(controller.path)}`.toLowerCase();

      return url;
    }

    /**
     * Remove first slash from a given word if exists and add the last if it does not exists.
     * @param formattedUrl - An Url to format.
     */
    private checkSlashes(formattedUrl: string): string
    {
        let resp = formattedUrl?.trim() || formattedUrl;

        if (!resp || resp === '/')
        {
            return '';
        }

        if (resp.charAt(0) === '/') { resp = resp.substr(1); }

        if (resp.charAt(resp.length -1) !== '/') {resp = `${resp}/`;}

        return resp;
    }
}