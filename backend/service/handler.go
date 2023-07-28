package service

import (
	"fmt"
	"net/http"
	"time"

	sdk "github.com/cosmos/cosmos-sdk/types"
	profilestypes "github.com/desmos-labs/desmos/v5/x/profiles/types"
	"github.com/rs/zerolog/log"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	client *ManagerClient
}

func NewHandler(client *ManagerClient) *Handler {
	return &Handler{
		client: client,
	}
}

type AskGrantRequest struct {
	User string `json:"user" binding:"required"`
}

func (h *Handler) AskGrant(c *gin.Context) {
	var req AskGrantRequest
	if err := c.ShouldBind(&req); err != nil {
		c.AbortWithError(http.StatusBadRequest, fmt.Errorf("empty user address"))
		return
	}

	_, err := sdk.AccAddressFromBech32(req.User)
	if err != nil {
		c.AbortWithError(http.StatusBadRequest, fmt.Errorf("invalid Desmos address"))
	}

	if !h.client.IsUserInGroup(req.User) {
		if err := h.client.AddUserToGroup(req.User); err != nil {
			log.Error().Err(err).Msg(fmt.Sprintf("Failed to add user %s to user group, raw logs: %s", req.User, err))
		} else {
			log.Info().Msg(fmt.Sprintf("Add user %s to user group successfully", req.User))
		}
	}

	if !h.client.HasFeeGrant(req.User) {
		expiration := time.Now().Add(7 * 24 * time.Hour)

		msgsTypes := []string{
			// Granted for users to be able to save their profiles
			sdk.MsgTypeURL(&profilestypes.MsgSaveProfile{}),
		}

		if err := h.client.GrantFeePermission(req.User, msgsTypes, nil, expiration); err != nil {
			log.Error().Err(err).Msg(fmt.Sprintf("Failed to grant user %s fee allowance, raw logs: %s", req.User, err))
		} else {
			log.Info().Msg(fmt.Sprintf("Grant user %s fee allowance successfully", req.User))
		}
	}

	c.JSON(http.StatusOK, "")
}
