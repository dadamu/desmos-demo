package service

import (
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
)

type ManagerClient struct {
	Wallet     *wallet.Wallet
	subspaceID uint64
	groupID    uint32

	sequence uint64
	mu       sync.Mutex

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

		feegrantClient:  feegrant.NewQueryClient(walletClient.GRPCConn),
		subspacesClient: subspacestypes.NewQueryClient(walletClient.GRPCConn),
	}, nil
}

func (c *ManagerClient) AddUserToGroup(address string) error {
	msg := subspacestypes.NewMsgAddUserToUserGroup(c.subspaceID, c.groupID, address, c.Wallet.AccAddress())
	return c.Broadcast(msg)
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
	return c.Broadcast(&execMsg)
}

func (c *ManagerClient) Broadcast(msg sdk.Msg) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	// Build the transaction data
	txData := wallettypes.NewTransactionData(msg).
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
