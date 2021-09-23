// Import server startup through a single index entry point

import './util.js';
import './register-api.js';
import './create-indexes.js';
import queryString from 'querystring'; 
import { HTTP } from 'meteor/http';
import { onPageLoad } from 'meteor/server-render'; 
import { Meteor } from 'meteor/meteor';  
 
// import { ServerStyleSheet } from "styled-components"
import { Helmet } from 'react-helmet'; 
// import App from '../../ui/App.jsx';

const IMAGE_WIDTH = 1200;
const IMAGE_HEIGHT = 800;

var siteName = 'Big-Dipper';
var description = 'Wallet deep link';
var price = "No Price"
var picWidth = IMAGE_WIDTH;
var picHeight = IMAGE_HEIGHT;
var apiUrl = "https://api.testnet.pylons.tech";
if(Meteor.settings.public.cosmos_sdk == 44){
    apiUrl = "https://api.devtestnet.pylons.tech/";
}
const defaultImage = '/img/buy_icon.png'; 
const defaultMetaTags = `
<meta property="og:title"       content="${siteName}" />
<meta property="og:description" content="${description}" />
<meta property="og:image"       content="${defaultImage}" />
<meta property="og:url"         content="${apiUrl}" />
`;

const BROWSER_BOT = 0;
const SLACK_BOT = 1;
const FACEBOOK_BOT = 2;
const TWITTER_BOT = 3;
const INSTAGRAM_BOT = 4;
const DISCORD_BOT = 5;
 
var botType = BROWSER_BOT;

async function  getRecipeData(recipe_id){
    selectedRecipe = await Recipes.findOne({ ID: recipe_id });
    return selectedRecipe
} 

Meteor.startup(() => { 
  
    onPageLoad(sink => {  
        let url = sink.request.url.search;     
        if(url == null){
            sink.appendToHead(defaultMetaTags); 
            return;
        }    
        const querys = queryString.parse(url); 
        var img = ''; 
        var selectedRecipe = null;
        var recipes = null; 
        if (querys['?action'] == "purchase_nft" && querys['recipe_id'] != null && querys['nft_amount'] == 1) { 
            const recipe_id = querys['recipe_id']   
            let getRecipesUrl ='https://api.testnet.pylons.tech/custom/pylons/list_recipe/';  
            if(Meteor.settings.public.cosmos_sdk == 44){
                getRecipesUrl ='https://api.devtestnet.pylons.tech/pylons/recipes/';   
            }
            try {
                let response = HTTP.get(getRecipesUrl); 
                recipes = JSON.parse(response.content).recipes;  
                if(Meteor.settings.public.cosmos_sdk == 44){
                    recipes = JSON.parse(response.content).Recipes;  
                }
                
            } catch (e) {
                console.log(url);
                console.log(e);
            }
            
            if (recipes != null && recipes.length > 0) {   
                for (let i in recipes) {
                    selectedRecipe = recipes[i];
                    if(selectedRecipe.ID == recipe_id){
                        break;
                    }
                    selectedRecipe = null;
                }
            }
            
            if (selectedRecipe != undefined && selectedRecipe != null) {                 
                const entries = selectedRecipe.Entries;
                
                if(selectedRecipe.Name != undefined && selectedRecipe.Name != ""){
                    siteName = selectedRecipe.Name; 
                }

                if(selectedRecipe.Description != undefined && selectedRecipe.Description != ""){ 
                    description = selectedRecipe.Description;
                    if (description.length > 20) {
                        description = description.substring(0, 20) + '...';
                    } 
                }

                const coinInputs = selectedRecipe.CoinInputs; 
                if (coinInputs.length > 0) {
                    if(coinInputs[0].Coin == "USD"){
                        price = Math.floor(coinInputs[0].Count / 100) + '.' + (coinInputs[0].Count % 100) + ' ' + coinInputs[0].Coin;
                    }
                    else{
                        price = coinInputs[0].Count + ' ' + coinInputs[0].Coin
                    }
                }

                //slackbot-linkexpanding
                //discordbot
                //facebookbot
                //twitterbot
                const { headers, browser } = sink.request;
                if(browser && browser.name.includes("slackbot")){
                    botType = SLACK_BOT;
                }
                else if(browser && browser.name.includes("facebookbot")){
                    botType = FACEBOOK_BOT;
                }
                else if(browser && browser.name.includes("twitterbot")){
                    botType = TWITTER_BOT;
                }
                else if(browser && browser.name.includes("discordbot")){
                    botType = DISCORD_BOT;
                } 
                else{
                    botType = BROWSER_BOT;
                }

                if(botType == TWITTER_BOT){
                    description = description + "<h4>" + price + "</h4>";
                }
                else if(botType == FACEBOOK_BOT){
                    siteName = siteName + "<h4>" + price + "</h4>";
                }
                else if(botType != SLACK_BOT){
                    description = description + "\n\n" + "Price\n" + price;
                } 
                
                if (entries != null) {
                    const itemoutputs = entries.ItemOutputs; 
                    if (itemoutputs.length > 0) {
                        let longs = itemoutputs[0].Longs; 
                        if(longs != null)
                        {
                            for (i = 0; i < longs.length; i++) { 
                                let weightRanges = longs[i].WeightRanges;
                                if(longs[i].Key == "Width"){
                                    if(weightRanges != null){
                                        picWidth = weightRanges[0].Lower * weightRanges[0].Weight;  
                                    } 
                                }
                                else if(longs[i].Key == "Height"){
                                    if(weightRanges != null){
                                        picHeight = weightRanges[0].Lower * weightRanges[0].Weight;   
                                    } 
                                }
                            }
                            picHeight = IMAGE_WIDTH * picHeight / picWidth;
                            picWidth = IMAGE_WIDTH;
                        }

                        let strings = itemoutputs[0].Strings; 
                        for (i = 0; i < strings.length; i++) {
                            try {
                                var values = strings[i].Value;
                                if (values.indexOf('http') >= 0 && (values.indexOf('.png') > 0 || values.indexOf('.jpg') > 0)) {
                                    img = values;     
                                    break;
                                }
                            } catch (e) {
                                console.log('strings[i].Value', e)
                                break;
                            }
        
                        }
                    } 
                }    
                
                const MetaTags = `  
                <meta name="description"              content="${description}">
                <meta property="og:type"              content="article">
                <meta property="og:title"             content="${siteName}" />
                <meta property="og:description"       content="${description}" data-rh="true"/>
                <meta property="og:url"               content="${Meteor.absoluteUrl() + url}" />
                <meta property="og:image"             content="${img}" />
                <meta property="og:image:width"       content="${picWidth}" />
                <meta property="og:image:height"      content="${picHeight}" />   
                <meta name="twitter:card"             content="summary_large_image" />
                <meta name="twitter:label1"           content="Price" />
                <meta name="twitter:data1"            content="${price}">
                `;                

                sink.appendToHead(MetaTags);
            }
            
        } 
        else if (querys['?action'] == "resell_nft" && querys['recipe_id'] != null && querys['nft_amount'] == 1) { 
            var trades = null;
            const recipe_id = querys['recipe_id']   
            let getTradeUrl ='https://api.testnet.pylons.tech/custom/pylons/list_trade/';  
            if(Meteor.settings.public.cosmos_sdk == 44){
                getTradeUrl ='https://api.devtestnet.pylons.tech/pylons/trades/';   
            }
            try {
                let response = HTTP.get(getTradeUrl); 
                trades = JSON.parse(response.content).trades;  
                if(Meteor.settings.public.cosmos_sdk == 44){
                    trades = JSON.parse(response.content).Trades;  
                }
                
            } catch (e) {
                console.log(url);
                console.log(e);
            }
            
            if (trades != null && trades.length > 0) {   
                for (let i in trades) {
                    selectedTrade = trades[i];
                    if(selectedTrade.ID == recipe_id){
                        break;
                    }
                    selectedTrade = null;
                }
            }
            
            if (selectedTrade != undefined && selectedTrade != null) {                 
                const itemOutputs = selectedTrade.ItemOutputs; 
                var priceValue = "";
                var priceCurrency = "pylon";  
                if (itemOutputs != undefined && itemOutputs != null && itemOutputs.length > 0) {
                    let strings = itemOutputs[0].Strings; 
                    if(strings != null)
                    {
                        for (j = 0; j < strings.length; j++) { 
                            let key = strings[j].Key;
                            let value = strings[j].Value;
                            if(key == "Price"){
                                priceValue = value;
                            }
                            else if(key == "Currency"){
                                priceCurrency = value;
                            }
                            else if(key == "NFT_URL"){
                                img = value;
                            }
                            else if(key == "Description"){
                                description = value;
                            }  
                            else if(key == "Name"){
                                siteName = value;
                            } 
                            
                        } 
                    }
                    let longs = itemOutputs.Longs; 
                    if(longs != null)
                    {
                        for (j = 0; j < longs.length; j++) { 
                            let key = longs[j].Key;
                            let value = longs[j].Value; 
                            if(key == "Width"){
                                picWidth = value; 
                            }
                            else if(key == "Height"){
                                picHeight = value
                            }
                        } 
                        picHeight = IMAGE_WIDTH * picHeight / picWidth;
                        picWidth = IMAGE_WIDTH;
                    } 
                }    
                
                if(selectedTrade.Strings != undefined && selectedTrade.Strings != ""){
                    siteName = selectedTrade.Name; 
                }

                if(selectedTrade.Description != undefined && selectedTrade.Description != ""){ 
                    description = selectedTrade.Description;
                    if (description.length > 20) {
                        description = description.substring(0, 20) + '...';
                    } 
                }

                if(priceCurrency == "USD"){
                    price = Math.floor(priceValue / 100) + '.' + (priceValue % 100) + ' ' + priceCurrency;
                }
                else{
                    price = priceValue + ' ' + priceCurrency;
                }
                //slackbot-linkexpanding
                //discordbot
                //facebookbot
                //twitterbot
                const { headers, browser } = sink.request;
                if(browser && browser.name.includes("slackbot")){
                    botType = SLACK_BOT;
                }
                else if(browser && browser.name.includes("facebookbot")){
                    botType = FACEBOOK_BOT;
                }
                else if(browser && browser.name.includes("twitterbot")){
                    botType = TWITTER_BOT;
                }
                else if(browser && browser.name.includes("discordbot")){
                    botType = DISCORD_BOT;
                } 
                else{
                    botType = BROWSER_BOT;
                }

                if(botType == TWITTER_BOT){
                    description = description + "<h4>" + price + "</h4>";
                }
                else if(botType == FACEBOOK_BOT){
                    siteName = siteName + "<h4>" + price + "</h4>";
                }
                else if(botType != SLACK_BOT){
                    description = description + "\n\n" + "Price\n" + price;
                } 
                
               
                
                const MetaTags = `  
                <meta name="description"              content="${description}">
                <meta property="og:type"              content="article">
                <meta property="og:title"             content="${siteName}" />
                <meta property="og:description"       content="${description}" data-rh="true"/>
                <meta property="og:url"               content="${Meteor.absoluteUrl() + url}" />
                <meta property="og:image"             content="${img}" />
                <meta property="og:image:width"       content="${picWidth}" />
                <meta property="og:image:height"      content="${picHeight}" />   
                <meta name="twitter:card"             content="summary_large_image" />
                <meta name="twitter:label1"           content="Price" />
                <meta name="twitter:data1"            content="${price}">
                `;                

                sink.appendToHead(MetaTags);
            }
        }
        else
        { 
            sink.appendToHead(defaultMetaTags); 
        } 
        // sink.appendToHead(sheet.getStyleTags());
    });
});