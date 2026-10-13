import { Amm } from './idl';
import IDL from './idl.json';
import { AnchorError } from '@coral-xyz/anchor';
import { PROGRAM_ID } from './constants';

type Codes = Amm['errors'][number]['code'];

class DynamicAmmError extends Error {
  public errorCode: number;
  public errorName: string;
  public errorMessage: string;

  constructor(error: object | Codes) {
    let _errorCode = 0;
    let _errorName = 'Something went wrong';
    let _errorMessage = 'Something went wrong';

    if (error instanceof Error) {
      const anchorError = AnchorError.parse(JSON.parse(JSON.stringify(error)).transactionLogs as string[]);

      if (anchorError?.program.toBase58() === PROGRAM_ID) {
        _errorCode = anchorError.error.errorCode.number;
        _errorName = anchorError.error.errorCode.code;
        _errorMessage = anchorError.error.errorMessage;
      }
    } else {
      const idlError = IDL.errors.find((err) => err.code === error);

      if (idlError) {
        _errorCode = idlError.code;
        _errorName = idlError.name;
        _errorMessage = idlError.msg;
      }
    }

    super(_errorMessage);

    this.errorCode = _errorCode;
    this.errorName = _errorName;
    this.errorMessage = _errorMessage;
  }
}

export default DynamicAmmError;
