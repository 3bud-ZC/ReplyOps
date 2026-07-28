declare module 'ssrf-req-filter' {
  import type { Agent as HttpAgent } from 'http';
  import type { Agent as HttpsAgent } from 'https';

  type RequestAgent = HttpAgent | HttpsAgent;

  function SSRFReqFilter(url: string): RequestAgent;

  namespace SSRFReqFilter {
    function requestFilterHandler<T extends RequestAgent>(agent: T): T;
  }

  export = SSRFReqFilter;
}
