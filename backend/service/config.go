package service

import (
	"fmt"
	"strings"

	wallettypes "github.com/desmos-labs/cosmos-go-wallet/types"
	"github.com/desmos-labs/desmos/v5/app"
	subspacetypes "github.com/desmos-labs/desmos/v5/x/subspaces/types"
)

const (
	EnvChainAccountRecoveryPhrase = "CHAIN_ACCOUNT_RECOVERY_PHRASE"

	EnvDemoSubspaceID  = "DEMO_SUBSPACE_ID"
	EnvDemoUserGroupID = "DEMO_USER_GROUP_ID"
)

type Config struct {
	Account     *wallettypes.AccountConfig
	Chain       *wallettypes.ChainConfig
	SubspaceID  uint64
	UserGroupID uint32
}

// Validate validates the given configuration returning any error
func (c *Config) Validate() error {
	if strings.TrimSpace(c.Account.Mnemonic) == "" {
		return fmt.Errorf("missing account mnemonic")
	}

	return nil
}

// ReadEnvConfig reads a Config instance from the env variables values
func ReadEnvConfig() (*Config, error) {
	subspaceID, err := subspacetypes.ParseSubspaceID(GetEnvOr(EnvDemoSubspaceID, ""))
	if err != nil {
		return nil, err
	}

	userGroupID, err := subspacetypes.ParseGroupID(GetEnvOr(EnvDemoUserGroupID, ""))
	if err != nil {
		return nil, err
	}

	cfg := &Config{
		Account: &wallettypes.AccountConfig{
			Mnemonic: GetEnvOr(EnvChainAccountRecoveryPhrase, ""),
			HDPath:   app.FullFundraiserPath,
		},
		Chain: &wallettypes.ChainConfig{
			Bech32Prefix:  app.Bech32MainPrefix,
			RPCAddr:       "https://rpc.morpheus.desmos.network:443",
			GRPCAddr:      "https://grpc.morpheus.desmos.network:443",
			GasPrice:      "0.01udaric",
			GasAdjustment: 1.5,
		},
		SubspaceID:  subspaceID,
		UserGroupID: userGroupID,
	}
	return cfg, cfg.Validate()
}
