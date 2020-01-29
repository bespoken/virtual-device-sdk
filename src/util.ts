import * as retrier from "retry";
import { OperationOptions, RetryOperation } from "retry";

export const retry = (fn: (bailFunction: any, num: any) => any, opts: OperationOptions) => {
  const run = (resolve: any, reject: any) => {
    const options = opts || {};
    let op: RetryOperation;

    if (!("randomize" in options)) {
      options.randomize = true;
    }

    op = retrier.operation(options);

    function bail(err: any) {
      reject(err || new Error("Aborted"));
    }

    function onError(err: any, num: any) {
      if (err.bail) {
        bail(err);
        return;
      }

      if (!op.retry(err)) {
        reject(op.mainError());
      }
    }

    function runAttempt(num: any) {
      let val;

      try {
        val = fn(bail, num);
      } catch (err) {
        onError(err, num);
        return;
      }

      Promise.resolve(val)
        .then(resolve)
        .catch(function catchIt(err) {
          onError(err, num);
        });
    }

    op.attempt(runAttempt);
  };

  return new Promise(run);
};
