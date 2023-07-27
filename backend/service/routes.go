package service

import "github.com/gin-gonic/gin"

func Register(router *gin.Engine, handler *Handler) {
	router.POST("/grant", func(c *gin.Context) {
		handler.AskGrant(c)
	})
}
