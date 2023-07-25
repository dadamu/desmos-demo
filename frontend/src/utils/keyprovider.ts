import {ModalConfig, Web3Auth, Web3AuthOptions} from "@web3auth/modal";
import {
  PrivateKeyProvider,
  PrivateKeyProviderStatus,
  PrivateKeySigner,
  SigningMode,
  PrivateKeyType,
  PrivateKey
} from "@desmoslabs/desmjs";
import {fromHex} from "@cosmjs/encoding";
import {ADAPTER_EVENTS, IAdapter, SafeEventEmitterProvider, WALLET_ADAPTER_TYPE} from "@web3auth/base";
import {LOGIN_MODAL_EVENTS} from "@web3auth/ui";

interface Web3AuthLogoutOptions {
  cleanup: boolean
}

export interface Web3AuthSecp256k1KeyProviderOptions {
  modalConfig?: Record<WALLET_ADAPTER_TYPE, ModalConfig>,
  adapters?: IAdapter<unknown>[],
  logoutOptions?: Web3AuthLogoutOptions,
}

export class Web3AuthSecp256k1KeyProvider extends PrivateKeyProvider {

  private readonly we3auth: Web3Auth;

  private readonly modalConfig?: Record<WALLET_ADAPTER_TYPE, ModalConfig>;

  private readonly logoutOptions?: Web3AuthLogoutOptions;

  private subscribeToEvents = (web3auth: Web3Auth) => {
    web3auth.on(ADAPTER_EVENTS.DISCONNECTED, () => {
      this.updateStatus(PrivateKeyProviderStatus.Disconnecting);
      this.updateStatus(PrivateKeyProviderStatus.NotConnected);
    });
    web3auth.on(ADAPTER_EVENTS.CONNECTED, (data: any) => {
      console.log("connected to wallet", data);
      // web3auth.provider will be available here after user is connected
    });
    web3auth.on(ADAPTER_EVENTS.CONNECTING, () => {
      console.log("connecting");
    });
    web3auth.on(ADAPTER_EVENTS.ERRORED, (error: any) => {
      console.log("error", error);
    });
    web3auth.on(LOGIN_MODAL_EVENTS.MODAL_VISIBILITY, (visibility: boolean) => {
      // Handle login cancel from user closing
      if (!visibility && this.we3auth.status !== "connected" && this.status === PrivateKeyProviderStatus.Connecting) {
        this.updateStatus(PrivateKeyProviderStatus.NotConnected);
      }
    })
  }

  constructor(config: Web3AuthOptions, options?: Web3AuthSecp256k1KeyProviderOptions) {
    super();
    this.we3auth = new Web3Auth(config);
    this.subscribeToEvents(this.we3auth);

    this.modalConfig = options?.modalConfig;
    options?.adapters?.forEach(a => {
      this.we3auth.configureAdapter(a);
    });

    this.logoutOptions = options?.logoutOptions;
  }

  async getPrivateKey(): Promise<PrivateKey> {
    const hexEncodedPrivateKey = await this.we3auth.provider!.request({
      method: "private_key"
    }) as string;

    return {
      type: PrivateKeyType.Secp256k1,
      key: fromHex(hexEncodedPrivateKey)
    };
  }

  override async connect(): Promise<void> {
    this.updateStatus(PrivateKeyProviderStatus.Connecting);

    console.log("initModal")
    await this.we3auth.initModal(this.modalConfig);
    console.log("connect");
    let eventEmitter: SafeEventEmitterProvider | null;
    try {
      eventEmitter = await this.we3auth.connect();
      console.log("event emitter", eventEmitter);
    } catch (e) {
      console.error(e);
      this.updateStatus(PrivateKeyProviderStatus.NotConnected);
      throw e;
    }

    if (eventEmitter === null) {
      this.updateStatus(PrivateKeyProviderStatus.NotConnected);
      throw new Error("error while connecting to web3auth");
    }

    this.updateStatus(PrivateKeyProviderStatus.Connected);
  }

  override async disconnect(): Promise<void> {
    if (this.status !== PrivateKeyProviderStatus.Connected) {
      return;
    }

    this.updateStatus(PrivateKeyProviderStatus.Disconnecting);

    try {
      await this.we3auth.logout(this.logoutOptions);
    } catch (e) {
      this.updateStatus(PrivateKeyProviderStatus.NotConnected);
      throw e;
    }

    this.updateStatus(PrivateKeyProviderStatus.NotConnected);
  }
}

export function web3AuthSigner(
  signingMode: SigningMode,
  config: Web3AuthOptions,
  options?: Web3AuthSecp256k1KeyProviderOptions
): PrivateKeySigner {
  return new PrivateKeySigner(new Web3AuthSecp256k1KeyProvider(config, options), signingMode);
}
