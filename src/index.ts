import Flow from '@faasjs/flow';
import * as TencentCloud from '@faasjs/provider-tencentcloud';

interface Stack {
  type: string;
  id: string;
  time: number;
}

class FlowTencentcloud extends Flow {
  public async remoteInvoke (index: number, data: any) {
    this.logger.debug('remoteInvoke #%i with %o', index, data);

    return TencentCloud.Scf.action(this.logger, this.config.resource!.provider!.config, {
      Action: 'Invoke',
      ClientContext: JSON.stringify(data),
      FunctionName: `${this.config.name}_invoke_${index + 1}`,
      InvocationType: 'Event'
    });
  }

  protected async processOrigin ({ type, event, context }: { type: string; event: any; context: any }): Promise<{
    context: {
      trackId: string;
      history: Stack[];
      current: Stack;
    };
    event: any;
    origin: {
      context: any;
      event: any;
      type: string;
    };
    type: string;
  }> {
    const processed: any = {
      context: context || Object.create(null),
      event: Object.create(null),
      origin: {
        context,
        event,
        type,
      },
      type,
    };

    // 生成当前环境
    processed.context.current = {
      id: context.request_id || new Date().getTime().toString(),
      time: new Date().getTime(),
      type,
    };

    // 生成历史环境
    if (!processed.context.history) {
      processed.context.history = [];
    }
    processed.context.history.push(processed.context.current);

    // 生成日志追踪 ID
    if (!processed.context.trackId) {
      processed.context.trackId = processed.context.current.id;
    }

    // 针对特殊类型进行格式统一适配
    switch (type) {
      case 'http':
        processed.event = {
          body: event.body,
          header: event.headers,
          method: event.httpMethod,
          query: event.queryString,
        };
        break;
      default:
        processed.event = event;
    }

    return processed;
  }
}

export default FlowTencentcloud;
