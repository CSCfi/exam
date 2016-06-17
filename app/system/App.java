package system;

import com.google.inject.AbstractModule;

import javax.inject.Singleton;

@Singleton
public class App extends AbstractModule {

    @Override
    protected void configure() {
        bind(SystemInitializer.class).asEagerSingleton();
    }

}
