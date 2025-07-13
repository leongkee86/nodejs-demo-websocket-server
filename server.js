const WebSocket = require( 'ws' );
const express = require( 'express' );
const cors = require( 'cors' );
const dotenv = require( 'dotenv' );
const app = express();

dotenv.config();

const HOSTNAME = process.env.HOSTNAME || "http://localhost";
const PORT = process.env.PORT || 3000;

// app.use( cors() ); // Allows all origins

// Set up CORS to allow only the specific origin.
app.use( cors(
    {
        origin: function ( origin, callback )
        {
            // If there's no origin (like curl or mobile apps), allow it.
            if (!origin)
            {
                return callback( null, true );
            }

            const allowedOrigin = process.env.ALLOWED_ORIGIN;
            if (origin === allowedOrigin)
            {
                callback( null, true );
            }
            else
            {
                callback( new Error( "Not allowed by CORS" ) );
            }
        }
    }
) );

// Create WebSocket server
const wss = new WebSocket.Server( { port : PORT } );

console.log( `WebSocket server running on ${ HOSTNAME }:${ PORT }` );

wss.on( 'connection',  ( ws ) =>
    {
        console.log( "New client connected" );

        // Listen for messages from the client
        ws.on( 'message', ( message ) =>
            {
                console.log( `Received: ${ message }` );
                broadcastMessage( ws, JSON.stringify( { "type": "message", "data": message.toString() } ) );
            }
        );

        // Handle connection close
        ws.on( 'close', () =>
            {
                console.log( "Client disconnected" );
                broadcastMessage( ws, JSON.stringify( { "type": "message", "data": `"${ ws.connectionId }" left the chat room...` } ), false );
                broadcastMessage( ws, JSON.stringify( { "type": "users", "data": wss.clients.size } ) );
            }
        );

        // Send a welcome message
        ws.send( JSON.stringify( { "type": "message", "data": "Successfully connected to the WebSocket server!" } ) );

        let _username = "User " + getNextUserId();
        ws.connectionId = _username;

        ws.send( JSON.stringify( { "type": "id", "data": _username } ) );
        ws.send( JSON.stringify( { "type": "message", "data": `Your username is "${ _username }".` } ) );

        broadcastMessage( ws, JSON.stringify( { "type": "message", "data": `"${ _username }" joined the chat room...` } ), false );
        broadcastMessage( ws, JSON.stringify( { "type": "users", "data": wss.clients.size } ) );
    }
);

let userId = 0;

function getNextUserId()
{
    userId++;
    return userId;
}

function broadcastMessage( ws, data, includeSender = true )
{
    wss.clients.forEach( ( client ) =>
        {
            if (( includeSender || client !== ws ) && client.readyState === WebSocket.OPEN)
            {
                client.send( data );
            }
        }
    );
}
