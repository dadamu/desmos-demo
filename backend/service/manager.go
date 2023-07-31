package service

import (
	"context"
	"fmt"
	"sync"
	"time"

	cosmosclient "github.com/cosmos/cosmos-sdk/client"
	"github.com/cosmos/cosmos-sdk/codec"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/cosmos/cosmos-sdk/x/authz"
	"github.com/cosmos/cosmos-sdk/x/feegrant"
	"github.com/desmos-labs/cosmos-go-wallet/client"
	wallettypes "github.com/desmos-labs/cosmos-go-wallet/types"
	"github.com/desmos-labs/cosmos-go-wallet/wallet"
	subspacestypes "github.com/desmos-labs/desmos/v5/x/subspaces/types"
	"zgo.at/zcache/v2"
)

type ManagerClient struct {
	Wallet     *wallet.Wallet
	subspaceID uint64
	groupID    uint32

	sequence uint64
	mu       sync.Mutex

	cache *zcache.Cache[string, bool]

	queue           chan (sdk.Msg)
	feegrantClient  feegrant.QueryClient
	subspacesClient subspacestypes.QueryClient
}

func NewManagerClient(txConfig cosmosclient.TxConfig, cdc codec.Codec) (*ManagerClient, error) {
	cfg, err := ReadEnvConfig()
	if err != nil {
		return nil, fmt.Errorf("error while read env: %s", err)
	}

	walletClient, err := client.NewClient(cfg.Chain, cdc)
	if err != nil {
		return nil, fmt.Errorf("error while creating wallet client: %s", err)
	}

	wallet, err := wallet.NewWallet(cfg.Account, walletClient, txConfig)
	if err != nil {
		return nil, fmt.Errorf("error while creating cosmos wallet: %s", err)
	}

	account, err := wallet.Client.GetAccount(wallet.AccAddress())
	if err != nil {
		return nil, err
	}

	return &ManagerClient{
		Wallet:   wallet,
		sequence: account.GetSequence(),

		subspaceID: cfg.SubspaceID,
		groupID:    cfg.UserGroupID,

		cache: zcache.New[string, bool](10*time.Second, 10*time.Second),

		queue:           make(chan sdk.Msg, 1000),
		feegrantClient:  feegrant.NewQueryClient(walletClient.GRPCConn),
		subspacesClient: subspacestypes.NewQueryClient(walletClient.GRPCConn),
	}, nil
}

func (c *ManagerClient) IsUserInGroup(address string) bool {
	res, err := c.subspacesClient.UserPermissions(context.Background(), subspacestypes.NewQueryUserPermissionsRequest(c.subspaceID, 0, address))
	if err != nil {
		return false
	}

	for _, detail := range res.Details {
		g := detail.GetGroup()
		if g != nil && g.GroupID == c.groupID {
			return true
		}
	}

	return false
}

func (c *ManagerClient) AddUserToGroup(address string) {
	c.queue <- subspacestypes.NewMsgAddUserToUserGroup(c.subspaceID, c.groupID, address, c.Wallet.AccAddress())
}

func (c *ManagerClient) HasFeeGrant(address string) bool {
	res, err := c.feegrantClient.Allowance(context.Background(), &feegrant.QueryAllowanceRequest{
		Granter: subspacestypes.GetTreasuryAddress(c.subspaceID).String(),
		Grantee: address,
	})
	if err != nil {
		return false
	}

	return res.Allowance != nil
}

func (c *ManagerClient) GrantFeePermission(address string, msgsTypes []string, amount sdk.Coins, expiration time.Time) error {
	// Build the basic allowance
	basicAllowance := &feegrant.BasicAllowance{
		SpendLimit: amount,
		Expiration: &expiration,
	}

	// Build the allowed message allowance
	allowedMsgAllowance, err := feegrant.NewAllowedMsgAllowance(basicAllowance, msgsTypes)
	if err != nil {
		return err
	}

	granteeAddress, err := c.Wallet.Client.ParseAddress(address)
	if err != nil {
		return err
	}

	// Build the message
	feeGrantMsg, err := feegrant.NewMsgGrantAllowance(allowedMsgAllowance, subspacestypes.GetTreasuryAddress(c.subspaceID), granteeAddress)
	if err != nil {
		return err
	}

	// Parse the addresses
	executer, err := c.Wallet.Client.ParseAddress(c.Wallet.AccAddress())
	if err != nil {
		return err
	}

	execMsg := authz.NewMsgExec(executer, []sdk.Msg{feeGrantMsg})
	c.queue <- &execMsg
	return nil
}

func (c *ManagerClient) ConsumeMsgs() error {
	var msgs []sdk.Msg
	for msg := range c.queue {
		if len(msgs) >= 10 || len(c.queue) == 0 {
			break
		}
		msgs = append(msgs, msg)
	}

	if len(msgs) == 0 {
		return nil
	}

	return c.Broadcast(msgs)
}

func (c *ManagerClient) Broadcast(msgs []sdk.Msg) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	// Build the transaction data
	txData := wallettypes.NewTransactionData(msgs...).
		WithGasAuto().
		WithFeeAuto().
		WithSequence(c.sequence)

	// Broadcast the transaction
	response, err := c.Wallet.BroadcastTxSync(txData)
	if err != nil {
		return err
	}

	// Check the response
	if response.Code != 0 {
		return fmt.Errorf("error while broadcasting msg: %s", response.RawLog)
	}

	c.sequence += 1
	return nil
}

func (c *ManagerClient) Cache(address string) {
	c.cache.Set(address, true)
}

func (c *ManagerClient) Has(address string) bool {
	_, found := c.cache.Get(address)
	return found
}
