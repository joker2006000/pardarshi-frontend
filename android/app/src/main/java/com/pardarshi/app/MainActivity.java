package com.pardarshi.app;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;
import com.capacitorjs.plugins.splashscreen.SplashScreenPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SplashScreenPlugin.class);
        super.onCreate(savedInstanceState);
    }
}