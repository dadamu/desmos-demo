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

	// Rate limit once per 10s
	if h.client.Has(req.User) {
		c.JSON(http.StatusTooManyRequests, gin.H{
			"message": "please wait 10 seconds",
		})
		return
	}
	h.client.Cache(req.User)

	if !h.client.IsUserInGroup(req.User) {
		h.client.AddUserToGroup(req.User)
	}

	if !h.client.HasFeeGrant(req.User) {
		expiration := time.Now().Add(7 * 24 * time.Hour)

		msgsTypes := []string{
			// Granted for users to be able to save their profiles
			sdk.MsgTypeURL(&profilestypes.MsgSaveProfile{}),
		}

		if err := h.client.GrantFeePermission(req.User, msgsTypes, nil, expiration); err != nil {
			log.Error().Err(err).Msg(fmt.Sprintf("Failed to add grant user %s fee allowance msg to queue, raw logs: %s", req.User, err))
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "ok",
	})
}
