import handler from "vinext/server/fetch-handler";
import { runWithConnectorBinding } from "../lib/connector-context";
import type { ConnectorBinding } from "../lib/connector-contract.mjs";
import { pushRoutes,dispatch } from '../lib/push-server';

export default {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext<{ CONNECTORS?: ConnectorBinding }>) {
    const push=await pushRoutes(request,env.DB);if(push)return push;
    const url=new URL(request.url);
    if(url.pathname.startsWith('/api/mushaf/')){
      const page=Number(url.pathname.split('/').pop());
      if(!Number.isInteger(page)||page<1||page>604)return new Response('Invalid page',{status:400});
      const upstream=await fetch(`https://raw.githubusercontent.com/batoulapps/quran-svg/main/svg/${String(page).padStart(3,'0')}.svg`,{signal:AbortSignal.timeout(20000)});
      if(!upstream.ok)return new Response('Page unavailable',{status:502});
      return new Response(upstream.body,{headers:{'Content-Type':'image/svg+xml','Cache-Control':'public,max-age=2592000','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; sandbox"}});
    }
    let binding = ctx.props?.CONNECTORS;
    // Local preview emulates the same request-scoped capability. This branch and
    // the auxiliary service binding are absent from production builds.
    if (import.meta.env.DEV && !binding && env.CONNECTORS) {
      const preview = env.CONNECTORS;
      const expiresAt = Date.now() + 60_000;
      binding = {
        async getContext() {
          if (Date.now() >= expiresAt) return { status: "request_context_expired" };
          return preview.getContext?.() ?? { status: "binding_unavailable" };
        },
        async invoke(connectorId, actionName, args) {
          if (Date.now() >= expiresAt) {
            return { status: "request_context_expired", message: "This request has expired. Please try again." };
          }
          return preview.invoke(connectorId, actionName, args);
        },
      };
    }
    return runWithConnectorBinding(binding, () => handler.fetch(request, env, ctx));
  },
  async scheduled(_event:ScheduledEvent,env:Cloudflare.Env){if(env.DB)await dispatch(env.DB);},
};
