package com.nextplay;
import net.runelite.client.RuneLite;
import net.runelite.client.externalplugins.ExternalPluginManager;
public class NextPlayLauncher { public static void main(String[] args) throws Exception { ExternalPluginManager.loadBuiltin(NextPlayPlugin.class);RuneLite.main(args); } }
