package service

import (
	"context"
	"fmt"
	"os"

	"github.com/cosmos/cosmos-sdk/codec"
	authtypes "github.com/cosmos/cosmos-sdk/x/auth/types"
	"github.com/rs/zerolog/log"
)

// GetEnvOr returns the value of the ENV variable having the given key, or the provided orValue
func GetEnvOr(envKey string, orValue string) string {
	if envValue := os.Getenv(envKey); envValue != "" {
		return envValue
	}
	return orValue
}

func GetAccountSequence(cdc codec.Codec, authClient authtypes.QueryClient, address string) (uint64, error) {
	log.Info().Msg(fmt.Sprintf("Manager address: %s", address))
	res, err := authClient.Account(context.Background(), &authtypes.QueryAccountRequest{Address: address})
	if err != nil {
		return 0, fmt.Errorf("error while getting account from node")
	}

	err = res.UnpackInterfaces(cdc)
	if err != nil {
		return 0, fmt.Errorf("error while unpacking response")
	}

	account, ok := res.Account.GetCachedValue().(authtypes.AccountI)
	if !ok {
		return 0, fmt.Errorf("error while get account from cached value")
	}

	return account.GetSequence(), nil
}
