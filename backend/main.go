package main

import (
	"context"
	"desmos-demo/service"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/desmos-labs/desmos/v5/app"
	"github.com/gin-contrib/cors"
	"github.com/rs/zerolog/log"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func init() {
	// load env
	err := godotenv.Load()
	if err != nil {
		log.Error().Err(err).Msg("Error loading .env file")
	}
}

func main() {
	// Setup Cosmos-related stuff
	app.SetupConfig(sdk.GetConfig())
	encodingCfg := app.MakeEncodingConfig()
	txConfig, cdc := encodingCfg.TxConfig, encodingCfg.Codec

	// Build the Gin server
	router := gin.New()
	router.Use(gin.Recovery(), cors.Default())

	client, err := service.NewManagerClient(txConfig, cdc)
	if err != nil {
		panic(err)
	}

	service.Register(router, service.NewHandler(client))

	httpServer := &http.Server{
		Addr:              fmt.Sprintf("%s:%s", "0.0.0.0", "3001"),
		Handler:           router,
		ReadHeaderTimeout: time.Minute,
		ReadTimeout:       time.Minute,
		WriteTimeout:      time.Minute,
	}

	// Listen for and trap any OS signal to gracefully shutdown and exit
	go trapSignal(httpServer)

	// Start the HTTP server
	// Block main process (signal capture will call WaitGroup's Done)
	log.Info().Str("address", httpServer.Addr).Msg("Starting API server")
	err = httpServer.ListenAndServe()
	if err != nil && !errors.Is(err, http.ErrServerClosed) {
		panic(err)
	}
}

// trapSignal traps the stops signals to gracefully shut down the server
func trapSignal(httpServer *http.Server) {
	// Wait for interrupt signal to gracefully shut down the server with
	// a timeout of 5 seconds.
	quit := make(chan os.Signal, 1)

	// Kill (no param) default send syscall.SIGTERM
	// Kill -2 is syscall.SIGINT
	// Kill -9 is syscall.SIGKILL but can't be caught, so don't need to add it
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Debug().Msg("shutting down API server")

	// The context is used to inform the server it has 5 seconds to finish
	// the request it is currently handling
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := httpServer.Shutdown(ctx); err != nil {
		log.Error().Err(err).Msg("API server forces to shutdown")
	}

	log.Debug().Msg("API server shutdown")
}
